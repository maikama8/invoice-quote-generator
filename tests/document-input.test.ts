import { describe, expect, it } from "vitest";
import { parseDocumentInput, parsePercentToBps } from "../src/lib/document-input";

const line = {
  description: "Consultation",
  quantity: "2.5",
  unitPrice: "35000",
  taxable: true,
  productId: null,
};

describe("parseDocumentInput", () => {
  it("parses a percent discount into basis points and totals", () => {
    const parsed = parseDocumentInput(
      {
        clientId: "client_1",
        currency: "NGN",
        issueDate: "2026-11-02",
        endDate: "2026-11-16",
        discountKind: "percent",
        discountValue: "7.5",
        notes: "",
        terms: "",
        lines: [line],
      },
      750,
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.discount).toEqual({ kind: "percent", basisPoints: 750 });
      expect(parsed.value.lines[0].quantityMilli).toBe(2500);
      expect(parsed.value.lines[0].unitPriceMinor).toBe(3_500_000);
      expect(parsed.value.totals.subtotalMinor).toBe(8_750_000);
      expect(parsed.value.totals.discountMinor).toBe(656_250);
      expect(parsePercentToBps("10")).toBe(1000);
      expect(parsePercentToBps("100.01")).toBeNull();
    }
  });

  it("rejects a due date before the issue date and a blank line", () => {
    expect(
      parseDocumentInput(
        {
          clientId: "client_1",
          currency: "NGN",
          issueDate: "2026-11-02",
          endDate: "2026-11-01",
          discountKind: "none",
          discountValue: "",
          notes: "",
          terms: "",
          lines: [line],
        },
        750,
      ).ok,
    ).toBe(false);
    const blank = parseDocumentInput(
      {
        clientId: "client_1",
        currency: "USD",
        issueDate: "2026-11-02",
        endDate: "2026-11-02",
        discountKind: "amount",
        discountValue: "10.50",
        notes: "",
        terms: "",
        lines: [{ ...line, description: "  " }],
      },
      0,
    );
    expect(blank.ok).toBe(false);
  });
});
