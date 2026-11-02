import { describe, expect, it } from "vitest";
import {
  formatDocumentNumber,
  nextSequence,
  NumberingError,
  parseDocumentNumber,
} from "../src/lib/numbering";

describe("document numbers", () => {
  it("pads the sequence for the year", () => {
    expect(formatDocumentNumber("INV", 2026, 1)).toBe("INV-2026-0001");
    expect(formatDocumentNumber("QT", 2026, 42, 4)).toBe("QT-2026-0042");
  });

  it("does not truncate a sequence wider than the pad", () => {
    expect(formatDocumentNumber("INV", 2026, 10000)).toBe("INV-2026-10000");
  });

  it("round-trips a number", () => {
    expect(parseDocumentNumber("INV-2026-0007")).toEqual({
      prefix: "INV",
      year: 2026,
      sequence: 7,
    });
  });

  it("takes the next sequence per prefix and year", () => {
    const existing = ["INV-2026-0007", "INV-2026-0002", "QT-2026-0009", "INV-2025-0099", "note"];
    expect(nextSequence(existing, "INV", 2026)).toBe(8);
    expect(nextSequence(existing, "QT", 2026)).toBe(10);
    expect(nextSequence(existing, "INV", 2027)).toBe(1);
    expect(nextSequence([], "INV", 2026)).toBe(1);
  });

  it("ignores a malformed number when allocating", () => {
    expect(nextSequence(["INV-26-1", "INV2026-0004"], "INV", 2026)).toBe(1);
  });

  it("rejects a bad prefix, year, or sequence", () => {
    expect(() => formatDocumentNumber("1NV", 2026, 1)).toThrow(NumberingError);
    expect(() => formatDocumentNumber("INV", 1999, 1)).toThrow(NumberingError);
    expect(() => formatDocumentNumber("INV", 2026, 0)).toThrow(NumberingError);
  });
});
