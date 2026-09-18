// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { INDORI_LINES, isIndoreTeam, pickIndoriLine } from "../src/utils/indoreEasterEgg";

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
