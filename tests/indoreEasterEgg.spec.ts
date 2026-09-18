// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  INDORI_LINES, INDORI_MODE_STORAGE_KEY, isIndoreTeam, isIndoriModeEnabled, pickIndoriLine, setIndoriModeEnabled
} from "../src/utils/indoreEasterEgg";

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) }
  });
});

describe("isIndoreTeam — by the device's own clock", () => {
  it("recognises both the current and the legacy zone id", () => {
    expect(isIndoreTeam("Asia/Kolkata")).toBe(true);
    expect(isIndoreTeam("Asia/Calcutta")).toBe(true);
  });

  it("is false for a US device, whatever store it is pointed at", () => {
    expect(isIndoreTeam("America/Chicago")).toBe(false);
    expect(isIndoreTeam("America/Los_Angeles")).toBe(false);
  });

  it("is false, not thrown, with no resolvable zone", () => {
    expect(isIndoreTeam("")).toBe(false);
  });
});

describe("isIndoriModeEnabled — the stored preference can never override the timezone", () => {
  it("stays off outside India even with the flag written to storage", () => {
    // This device (the test runner) is not in India, so this exercises the real gate.
    localStorage.setItem(INDORI_MODE_STORAGE_KEY, "true");
    const inIndia = isIndoreTeam();
    expect(isIndoriModeEnabled()).toBe(inIndia);
  });

  it("round-trips the preference", () => {
    setIndoriModeEnabled(true);
    expect(localStorage.getItem(INDORI_MODE_STORAGE_KEY)).toBe("true");
    setIndoriModeEnabled(false);
    expect(localStorage.getItem(INDORI_MODE_STORAGE_KEY)).toBe("false");
  });
});

describe("the lines", () => {
  it("every line has both a Devanagari text and a romanised fallback", () => {
    for (const line of INDORI_LINES) {
      expect(line.text).toMatch(/[\u0900-\u097F]/);      // contains Devanagari
      expect(line.fallbackText).toMatch(/^[\x00-\x7F]+$/); // plain ASCII for an English voice
    }
  });

  it("pickIndoriLine covers the whole list and is pinnable", () => {
    expect(pickIndoriLine(() => 0)).toBe(INDORI_LINES[0]);
    expect(pickIndoriLine(() => 0.999)).toBe(INDORI_LINES[INDORI_LINES.length - 1]);
  });
});
