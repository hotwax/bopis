import { logger } from "@common";

/**
 * Epson ePOS-Device printing over the network.
 *
 * Targets TM printers that expose the ePOS service in firmware (TM-m30II,
 * TM-m30III and similar). The SDK is loaded from public/epos-2.27.0.js via a
 * script tag in index.html, so it arrives on `window.epson` rather than as a
 * module import.
 *
 * Connections are opened per job and always torn down: the printer accepts a
 * small number of concurrent sessions, and leaked ones make it unreachable
 * until it is power cycled.
 */

export interface EposPrinterConfig {
  /** Printer IP address or hostname. */
  host: string;
  /** 8043 for SSL (required from an https page), 8008 for plaintext. */
  port?: number;
  /** Device id. TM printers use "local_printer". */
  devid?: string;
  /** Per-job timeout in ms, applied to both connect and print. */
  timeout?: number;
}

export interface EposPrintResult {
  success: boolean;
  code: string;
  status: number;
  battery: number;
}

/** Builds the receipt. Called with the SDK's printer object. */
export type EposJob = (printer: any) => void;

const DEFAULT_PORT = 8043;
const DEFAULT_DEVID = "local_printer";
const DEFAULT_TIMEOUT = 60000;

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

/**
 * Serialises jobs per host. Two prints to the same printer at once will
 * collide on the connection limit, so they queue instead.
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

const connect = (config: EposPrinterConfig): Promise<any> => {
  return new Promise((resolve, reject) => {
    if(!window.epson) {
      reject(new Error("ePOS SDK not loaded"));

      return;
    }

    const device = new window.epson.ePOSDevice();

    device.connect(
      config.host,
      config.port ?? DEFAULT_PORT,
      (result: string) => {
        // The SDK reports SSL_CONNECT_OK when the session is encrypted.
        if(result === "OK" || result === "SSL_CONNECT_OK") {
          resolve(device);

          return;
        }

        reject(new Error(`Could not reach printer at ${config.host}: ${result}`));
      },
      { eposprint: true }
    );
  });
}

const createPrinter = (device: any, config: EposPrinterConfig): Promise<any> => {
  return new Promise((resolve, reject) => {
    device.createDevice(
      config.devid ?? DEFAULT_DEVID,
      device.DEVICE_TYPE_PRINTER,
      { crypto: false, buffer: false },
      // createDevice is asynchronous; the printer arrives here, not as a return value.
      (printer: any, code: string) => {
        if(!printer) {
          reject(new Error(`Could not open printer: ${code}`));

          return;
        }

        printer.timeout = config.timeout ?? DEFAULT_TIMEOUT;
        resolve(printer);
      }
    );
  });
}

const send = (printer: any): Promise<EposPrintResult> => {
  return new Promise((resolve, reject) => {
    printer.onreceive = (res: any) => {
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
    printer.onerror = (err: any) => reject(new Error(`Print failed: ${err?.status ?? err}`));
    printer.send();
  });
}

const teardown = async (device: any, printer: any): Promise<void> => {
  try {
    if(printer) {
      await new Promise<void>((resolve) => device.deleteDevice(printer, () => resolve()));
    }

    device.disconnect();
  } catch (err) {
    // Teardown failures must not mask the print result.
    logger.warn("Failed to release printer connection", err);
  }
}

/**
 * Opens a connection, runs the job, and releases the connection either way.
 */
const printReceipt = (config: EposPrinterConfig, job: EposJob): Promise<EposPrintResult> => {
  const timeout = config.timeout ?? DEFAULT_TIMEOUT;

  return enqueue(config.host, async () => {
    const device = await withTimeout(
      connect(config),
      timeout,
      `Timed out connecting to printer at ${config.host}`
    );

    let printer: any = null;

    try {
      printer = await createPrinter(device, config);
      job(printer);

      return await send(printer);
    } finally {
      await teardown(device, printer);
    }
  });
}

/** Prints a short sheet to confirm a printer is configured correctly. */
const testPrint = async (config: EposPrinterConfig): Promise<EposPrintResult> => {
  const result = await printReceipt(config, (printer) => {
    printer.addTextAlign(printer.ALIGN_CENTER);
    printer.addTextDouble(true, true);
    printer.addText("HotWax Commerce\n");
    printer.addTextDouble(false, false);
    printer.addText("Test print\n");
    printer.addText(`${config.host}\n`);
    printer.addFeedLine(3);
    printer.addCut(printer.CUT_FEED);
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
 * Printable width of an 80mm roll at 203 dpi. The roll is 80mm wide but loses
 * 4mm to each margin, so an 80mm PDF is scaled to 90% rather than clipped.
 */
const PRINTABLE_DOTS = 576;

let pdfjs: Promise<any> | null = null;

/** Loaded on first use, so pdf.js stays out of the main bundle. */
const loadPdfjs = (): Promise<any> => {
  if(!pdfjs) {
    pdfjs = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?worker")
    ]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerPort = new worker.default();

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
const renderPdf = async (blob: Blob): Promise<HTMLCanvasElement[]> => {
  const lib = await loadPdfjs();
  const pdf = await lib.getDocument({ data: await blob.arrayBuffer() }).promise;
  const canvases: HTMLCanvasElement[] = [];

  for(let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const scale = PRINTABLE_DOTS / page.getViewport({ scale: 1 }).width;
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
  // Rendering finishes before the connection opens: the job callback runs
  // inside the connection lifecycle and must not block on I/O.
  const pages = await withTimeout(
    renderPdf(blob),
    config.timeout ?? DEFAULT_TIMEOUT,
    "Timed out rendering the document for printing"
  );

  return printReceipt(config, (printer) => {
    // Threshold rather than the default dither: a packing slip is text and line
    // art, and dithering turns small glyphs into speckle.
    printer.halftone = printer.HALFTONE_THRESHOLD;
    printer.brightness = 1;

    pages.forEach((canvas) => {
      printer.addImage(
        canvas.getContext("2d"), 0, 0, canvas.width, canvas.height,
        printer.COLOR_1, printer.MODE_MONO
      );
    });

    printer.addCut(printer.CUT_FEED);
  });
}

export const useEposPrinter = () => {
  return {
    printReceipt,
    printPdf,
    testPrint,
    getStatus,
    describeStatus
  }
}
