import { describe, expect, it } from "vitest";
import { convertQuoteToInvoice, ConversionError, type QuoteSnapshot } from "../src/lib/convert-quote";

function quote(overrides: Partial<QuoteSnapshot> = {}): QuoteSnapshot {
  return {
    id: "quote_1",
    number: "QT-2026-0003",
    status: "accepted",
    clientId: "client_1",
    currency: "NGN",
    taxName: "VAT",
    taxRateBps: 750,
    discount: { kind: "percent", basisPoints: 500 },
    notes: "Phase one.",
    terms: "14 days.",
    issueDate: "2026-10-21",
    validUntil: "2026-11-20",
    lines: [
      {
        position: 0,
        description: "Website design",
        productId: "prod_web",
        quantityMilli: 1000,
        unitPriceMinor: 120_000_000,
        taxable: true,
      },
    ],
    ...overrides,
  };
}

const options = {
  invoiceNumber: "INV-2026-0008",
  issueDate: "2026-11-02",
  paymentTermsDays: 14,
  today: "2026-11-02",
};

describe("convertQuoteToInvoice", () => {
  it("copies the commercial terms and assigns the invoice number", () => {
    const source = quote();
    const draft = convertQuoteToInvoice(source, options);
    expect(draft.number).toBe("INV-2026-0008");
    expect(draft.status).toBe("draft");
    expect(draft.quoteId).toBe("quote_1");
    expect(draft.clientId).toBe("client_1");
    expect(draft.currency).toBe("NGN");
    expect(draft.taxRateBps).toBe(750);
    expect(draft.discount).toEqual({ kind: "percent", basisPoints: 500 });
    expect(draft.lines).toEqual(source.lines);
    expect(draft.issueDate).toBe("2026-11-02");
    expect(draft.dueDate).toBe("2026-11-16");
    expect(draft.totals.subtotalMinor).toBe(120_000_000);
    expect(draft.totals.discountMinor).toBe(6_000_000);
    expect(draft.totals.taxMinor).toBe(8_550_000);
    expect(draft.totals.totalMinor).toBe(122_550_000);
  });

  it("does not mutate the quote", () => {
    const source = quote();
    const draft = convertQuoteToInvoice(source, options);
    source.lines[0].description = "Changed after conversion";
    source.notes = "Changed notes";
    expect(draft.lines[0].description).toBe("Website design");
    expect(draft.notes).toBe("Phase one.");
  });

  it("converts a draft and a sent quote that is still valid", () => {
    expect(convertQuoteToInvoice(quote({ status: "draft" }), options).status).toBe("draft");
    expect(
      convertQuoteToInvoice(quote({ status: "sent", validUntil: "2026-11-02" }), options).number,
    ).toBe("INV-2026-0008");
  });

  it("still converts an accepted quote after the valid-until date", () => {
    const draft = convertQuoteToInvoice(
      quote({ status: "accepted", validUntil: "2026-10-01" }),
      options,
    );
    expect(draft.quoteNumber).toBe("QT-2026-0003");
  });

  it("rejects converted, declined, and expired quotes", () => {
    expect(() => convertQuoteToInvoice(quote({ status: "converted" }), options)).toThrow(
      ConversionError,
    );
    expect(() => convertQuoteToInvoice(quote({ status: "declined" }), options)).toThrow(
      /declined/,
    );
    expect(() =>
      convertQuoteToInvoice(quote({ status: "sent", validUntil: "2026-11-01" }), options),
    ).toThrow(/expired/);
  });

  it("rejects an empty quote and bad payment terms", () => {
    expect(() => convertQuoteToInvoice(quote({ lines: [] }), options)).toThrow(/line item/);
    expect(() => convertQuoteToInvoice(quote(), { ...options, paymentTermsDays: -1 })).toThrow(
      /Payment terms/,
    );
  });

  it("uses same-day terms when payment terms are zero", () => {
    const draft = convertQuoteToInvoice(quote(), { ...options, paymentTermsDays: 0 });
    expect(draft.dueDate).toBe("2026-11-02");
  });
});
