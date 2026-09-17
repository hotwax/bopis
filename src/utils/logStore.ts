import type { LogEvent, LoggerHook } from "vue-logger-plugin";

// Persists every log line the app emits to IndexedDB so a device we cannot reach
// can still be inspected after the fact. Console output is lost on reload and the
// Faro collector needs a network path; this survives both.
//
// Two rules hold throughout this file: nothing here may throw into the calling
// code path, and nothing here may call logger.* — that would re-enter this hook
// and recurse. Failures are swallowed on purpose.

const DB_NAME = "bopis-logs";
const STORE_NAME = "entries";
const DB_VERSION = 1;

// Roughly a few days of normal use. Old entries are dropped rather than growing
// without bound on a device that is never cleared.
const MAX_ENTRIES = 2000;
const TRIM_EVERY = 50;

export interface LogRecord {
  id?: number;
  time: number;
  level: string;
  message: string;
  caller?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let writesSinceTrim = 0;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        store.createIndex("time", "time");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // A failed open must not be cached, otherwise one transient failure disables
  // logging for the whole session.
  dbPromise.catch(() => { dbPromise = null; });

  return dbPromise;
}

function runTransaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest | void, result?: () => T): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    work(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve(result ? result() : (undefined as T));
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

// Drops the oldest entries once the store outgrows MAX_ENTRIES. Runs occasionally
// rather than on every write, since counting costs a full transaction.
async function trim() {
  const db = await openDb();

  const total = await new Promise<number>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (total <= MAX_ENTRIES) return;

  let remaining = total - MAX_ENTRIES;

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const request = transaction.objectStore(STORE_NAME).index("time").openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || remaining <= 0) return;
      cursor.delete();
      remaining -= 1;
      cursor.continue();
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function serialise(args: any[]) {
  return (args || []).map((arg) => {
    if (typeof arg === "string") return arg;

    try {
      return JSON.stringify(arg);
    } catch (error) {
      return String(arg);
    }
  }).join(" ");
}

async function append(record: LogRecord) {
  await runTransaction("readwrite", (store) => { store.add(record); });

  writesSinceTrim += 1;
  if (writesSinceTrim >= TRIM_EVERY) {
    writesSinceTrim = 0;
    await trim();
  }
}

/** Most recent entries first. */
async function readLogs(limit = 500): Promise<LogRecord[]> {
  try {
    const db = await openDb();

    return await new Promise<LogRecord[]>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .index("time")
        .openCursor(null, "prev");

      const records: LogRecord[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || records.length >= limit) return resolve(records);
        records.push(cursor.value as LogRecord);
        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    return [];
  }
}

async function clearLogs() {
  try {
    await runTransaction("readwrite", (store) => { store.clear(); });
  } catch (error) {
    // Nothing useful to do, and logging here would recurse
  }
}

const logStoreHook: LoggerHook = {
  run(event: LogEvent) {
    // Fire and forget: the caller must never wait on storage, nor see it fail.
    void append({
      time: Date.now(),
      level: String(event.level),
      message: serialise(event.argumentArray),
      caller: event.caller
        ? `${event.caller.fileName ?? ""}:${event.caller.lineNumber ?? ""} ${event.caller.functionName ?? ""}`.trim()
        : undefined
    }).catch(() => { /* never surface a logging failure */ });
  }
}

export const logStore = {
  logStoreHook,
  readLogs,
  clearLogs,
  MAX_ENTRIES
}
