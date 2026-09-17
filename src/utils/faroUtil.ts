import { faro, getWebInstrumentations, initializeFaro, LogLevel } from "@grafana/faro-web-sdk";
import type { LogEvent, LoggerHook, LogLevel as VueLogLevel } from "vue-logger-plugin";

let isInitialised = false;

const parseJson = (value: any, fallback: any = {}) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (err) {
    return fallback;
  }
}

// vue-logger-plugin and Faro happen to share the same level strings, but map them
// explicitly so a change on either side surfaces as a type error rather than silently
// mislabelling every log line.
const faroLogLevel: Record<VueLogLevel, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  log: LogLevel.LOG
}

/**
 * Starts Faro so app logs, unhandled errors and promise rejections reach the collector.
 * No-op when VITE_FARO_COLLECTOR_URL is unset, which is how an environment opts out.
 */
const initialiseFaro = () => {
  if (isInitialised) return;

  const collectorUrl = import.meta.env.VITE_FARO_COLLECTOR_URL;
  if (!collectorUrl) return;

  const versionConfig = parseJson(import.meta.env.VITE_APP_VERSION_CONFIG);
  const versionInfo = parseJson(import.meta.env.VITE_APP_VERSION_INFO);

  initializeFaro({
    url: collectorUrl,
    app: {
      name: versionConfig.appId || "BOPIS",
      version: versionInfo.version,
      environment: versionConfig.environmentTypeId,
      gitHash: versionInfo.revision
    },
    instrumentations: [
      // captureConsole stays off deliberately. vue-logger-plugin already writes every
      // log to the console, so capturing it here would duplicate each line, and it
      // would also pick up raw console.* calls that never went through
      // RedactSensitiveDataHook — which is what keeps bearer tokens out of the payload.
      ...getWebInstrumentations({ captureConsole: false })
    ]
  });

  isInitialised = true;
}

/**
 * Forwards logger output to Faro. Registered as an *after* hook so the arguments it
 * receives have already passed through the logger's beforeHooks — RedactSensitiveDataHook
 * included — meaning nothing unredacted is shipped off the device.
 */
const faroLoggerHook: LoggerHook = {
  run(event: LogEvent) {
    if (!isInitialised) return;

    try {
      faro.api.pushLog(event.argumentArray, {
        level: faroLogLevel[event.level] ?? LogLevel.LOG,
        context: event.caller
          ? {
              fileName: String(event.caller.fileName ?? ""),
              functionName: String(event.caller.functionName ?? ""),
              lineNumber: String(event.caller.lineNumber ?? "")
            }
          : undefined
      });
    } catch (err) {
      // Never let telemetry break the calling code path, and never log here — that
      // would re-enter this hook.
    }
  }
}

export const faroUtil = {
  initialiseFaro,
  faroLoggerHook
}
