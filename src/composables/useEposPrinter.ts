import { logger } from "@common";

/**
 * Epson ePOS-Print: receipt XML posted over HTTP to the printer's own service.
 *
 * ePOS-Print is the transport every ePOS-capable TM printer understands — a
 * TM-T88V with a UB-E04 card, a TM-T88VII, and the TM-m30 series alike — which
 * keeps one code path across mixed hardware. The alternative, ePOS-Device over
 * WebSocket, is only available on printers with the service in firmware.
 *
 * The SDK is loaded from public/epos-2.27.0.js via a script tag in index.html,
 * so it arrives on `window.epson` rather than as a module import.
 */

export interface EposPrinterConfig {
  /**
   * Printer host, optionally with a port: "192.168.1.50" for a real printer,
   * "localhost:8008" for the local mock. This is the only value that differs
   * between a development machine and a store.
   */
  host: string;
  /** https rather than http. Required from a page served over https. */
  ssl?: boolean;
  /**
   * Printable width in dots. Model-dependent, and getting it wrong clips the
   * right edge of rasterised documents:
   *   512 — TM-T88 series (V, VI, VII), 180 dpi
   *   576 — TM-m30 series (m30II, m30III), 203 dpi
   * Defaults to 512, the narrower of the two: printing narrow on a wide
   * printer leaves a margin, while printing wide on a narrow one loses content.
   */
  widthDots?: number;
  /** Device id. TM printers use "local_printer". */
  devid?: string;
  /** Per-job timeout in ms. */
  timeout?: number;
}

export interface EposPrintResult {
  success: boolean;
  code: string;
  status: number;
  battery: number;
}

/** Builds the receipt. Called with the SDK's ePOSBuilder. */
export type EposJob = (builder: any) => void;

const DEFAULT_DEVID = "local_printer";
const DEFAULT_TIMEOUT = 60000;

/** TM-T88 series printable width on an 80mm roll: 72.2mm at 180 dpi. */
const DEFAULT_WIDTH_DOTS = 512;

/** Status bits from the SDK, most user-actionable first. */
const ASB_FLAGS: Array<[number, string]> = [
  [8, "Printer is offline"],
  [32, "Cover is open"],
  [524288, "Out of paper"],
  [2048, "Auto cutter error"],
  [1024, "Mechanical error"],
  [8192, "Unrecoverable error"],
  [16384, "Automatically recoverable error"],
  [2147483648, "Print spooler is stopped"],
  [1, "No response from printer"],
  [131072, "Paper is nearly out"]
];

/**
 * Turns an ASB status value into readable conditions.
 * Returns an empty array when nothing is wrong.
 */
const describeStatus = (status: number): string[] => ASB_FLAGS
  .filter(([bit]) => (status & bit) !== 0)
  .map(([, label]) => label);

const serviceUrl = (config: EposPrinterConfig): string => {
  const scheme = config.ssl ? "https" : "http";
  const devid = config.devid ?? DEFAULT_DEVID;
  const timeout = config.timeout ?? DEFAULT_TIMEOUT;

  return `${scheme}://${config.host}/cgi-bin/epos/service.cgi?devid=${devid}&timeout=${timeout}`;
}

/**
 * Serialises jobs per host. The printer handles one job at a time, and
 * overlapping posts produce interleaved or dropped output.
 */
const queues = new Map<string, Promise<any>>();

const enqueue = <T>(host: string, task: () => Promise<T>): Promise<T> => {
  const previous = queues.get(host) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);

  // Keep the chain alive on failure so a rejected job does not wedge the queue.
  queues.set(host, next.catch(() => undefined));

  return next;
}

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * Turns the SDK's transport failure into something actionable.
 *
 * The status is the underlying XHR status, and 0 — meaning no response reached
 * the browser at all — is by far the most common and least informative value.
 */
const explainTransportError = (err: any): string => {
  const status = err?.status;

  if(status === 0 || status === undefined) {
    return "No response. Check the printer is switched on, that its address is " +
      "correct, and that this device is on the same network.";
  }

  if(status === 404) {
    return "The printer answered but has no ePOS-Print service. Enable " +
      "ePOS-Print in its Web Config, or check the model supports it.";
  }

  if(status === 401 || status === 403) {
    return `The printer refused the request (${status}). It may require authentication.`;
  }

  return `The printer responded with status ${status}.`;
}

const post = (config: EposPrinterConfig, xml: string): Promise<EposPrintResult> => {
  return new Promise((resolve, reject) => {
    const eposPrint = new window.epson.ePOSPrint(serviceUrl(config));

    eposPrint.onreceive = (res: any) => {
      const result: EposPrintResult = {
        success: res.success,
        code: res.code,
        status: res.status,
        battery: res.battery
      };

      if(res.success) {
        resolve(result);

        return;
      }

      const conditions = describeStatus(res.status);

      reject(new Error(conditions.length ? conditions.join(", ") : `Print failed: ${res.code}`));
    };

    // Transport-level failure: wrong host, service disabled, TLS rejected.
    eposPrint.onerror = (err: any) => {
      reject(new Error(`Could not reach printer at ${config.host}. ${explainTransportError(err)}`));
    };

    eposPrint.send(xml);
  });
}

/** Builds a receipt with the SDK's builder and posts it to the printer. */
const printReceipt = (config: EposPrinterConfig, job: EposJob): Promise<EposPrintResult> => {
  return enqueue(config.host, async () => {
    if(!window.epson) {
      throw new Error("ePOS SDK not loaded");
    }

    const builder = new window.epson.ePOSBuilder();

    job(builder);

    return await withTimeout(
      post(config, builder.toString()),
      config.timeout ?? DEFAULT_TIMEOUT,
      `Timed out printing at ${config.host}`
    );
  });
}

let pdfjs: Promise<any> | null = null;

/** Loaded on first use, so pdf.js stays out of the main bundle. */
const loadPdfjs = (): Promise<any> => {
  if(!pdfjs) {
    // The worker is served from public/ rather than imported. Importing it —
    // with ?worker or ?url — routes it through Vite's transform pipeline, which
    // injects client code referencing `document`; that throws inside the worker,
    // the worker never signals ready, and getDocument() hangs forever.
    // public/ is served verbatim, so pdf.js's own worker build stays intact.
    // Keep public/pdf.worker.min.mjs in step with the pinned pdfjs-dist version.
    pdfjs = import("pdfjs-dist").then((lib) => {
      const workerUrl = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

      lib.GlobalWorkerOptions.workerPort = new Worker(workerUrl, { type: "module" });

      return lib;
    });
  }

  return pdfjs;
}

/**
 * Rasterises every page of a PDF to the printer's width.
 *
 * The document has to be receipt-shaped already. A page-sized PDF (A4, Letter)
 * scales to roughly a third and prints illegibly, so check the page size before
 * sending one here.
 */
const renderPdf = async (blob: Blob, widthDots: number): Promise<HTMLCanvasElement[]> => {
  const lib = await loadPdfjs();
  const pdf = await lib.getDocument({ data: await blob.arrayBuffer() }).promise;
  const canvases: HTMLCanvasElement[] = [];

  for(let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const scale = widthDots / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const context = canvas.getContext("2d") as CanvasRenderingContext2D;

    // pdf.js renders onto a transparent ground. Without a white fill the raster
    // inverts and the whole page comes out black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    // intent "print" avoids pdf.js's requestAnimationFrame-driven display
    // scheduling, which never completes while the tab is backgrounded.
    await page.render({ canvasContext: context, viewport, intent: "print" }).promise;

    canvases.push(canvas);
  }

  return canvases;
}

/**
 * Prints a receipt-shaped PDF as a raster image.
 *
 * Barcodes are rasterised along with everything else, so they scan less
 * reliably than the printer's native barcode commands. Where the underlying
 * data is available, addBarcode/addSymbol give a better result.
 */
const printPdf = async (config: EposPrinterConfig, blob: Blob): Promise<EposPrintResult> => {
  const pages = await withTimeout(
    renderPdf(blob, config.widthDots ?? DEFAULT_WIDTH_DOTS),
    config.timeout ?? DEFAULT_TIMEOUT,
    "Timed out rendering the document for printing"
  );

  return printReceipt(config, (builder) => {
    // Threshold rather than the default dither: a packing slip is text and line
    // art, and dithering turns small glyphs into speckle.
    builder.halftone = builder.HALFTONE_THRESHOLD;
    builder.brightness = 1;

    pages.forEach((canvas) => {
      builder.addImage(
        canvas.getContext("2d"), 0, 0, canvas.width, canvas.height,
        builder.COLOR_1, builder.MODE_MONO
      );
    });

    builder.addCut(builder.CUT_FEED);
  });
}

/** Prints a short sheet to confirm a printer is configured correctly. */
const testPrint = async (config: EposPrinterConfig): Promise<EposPrintResult> => {
  const result = await printReceipt(config, (builder) => {
    builder.addTextAlign(builder.ALIGN_CENTER);
    builder.addTextDouble(true, true);
    builder.addText("HotWax Commerce\n");
    builder.addTextDouble(false, false);
    builder.addText("Test print\n");
    builder.addText(`${config.host}\n`);
    builder.addFeedLine(3);
    builder.addCut(builder.CUT_FEED);
  });

  logger.log(`Test print sent to ${config.host}`, result);

  return result;
}

/**
 * Reports what is wrong with a printer, if anything.
 * Prints nothing: an empty job still returns the printer's status.
 */
const getStatus = async (config: EposPrinterConfig): Promise<string[]> => {
  const result = await printReceipt(config, () => undefined);

  return describeStatus(result.status);
}

/**
 * Printer configuration from the environment.
 *
 * A stopgap: a printer belongs to a counter, so this should become per-facility
 * configuration rather than a build-time variable. Returns null when no printer
 * is configured, which callers treat as "fall back to the browser".
 */
const configFromEnv = (): EposPrinterConfig | null => {
  const host = import.meta.env.VITE_EPOS_HOST;

  if(!host) {
    return null;
  }

  const widthDots = Number(import.meta.env.VITE_EPOS_WIDTH_DOTS);

  return {
    host,
    ssl: import.meta.env.VITE_EPOS_SSL === "true",
    widthDots: Number.isFinite(widthDots) && widthDots > 0 ? widthDots : undefined
  };
}

export const useEposPrinter = () => {
  return {
    configFromEnv,
    printReceipt,
    printPdf,
    testPrint,
    getStatus,
    describeStatus
  }
}
