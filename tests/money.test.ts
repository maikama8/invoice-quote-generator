import { describe, expect, it } from "vitest";
import {
  computeTotals,
  discountMinorFor,
  formatMajorInput,
  formatQuantity,
  lineAmountMinor,
  MoneyError,
  parseMajorToMinor,
  parseQuantityMilli,
  roundHalfUpDiv,
} from "../src/lib/money";

describe("roundHalfUpDiv", () => {
  it("rounds a midpoint away from zero", () => {
    expect(roundHalfUpDiv(15, 10)).toBe(2);
    expect(roundHalfUpDiv(14, 10)).toBe(1);
    expect(roundHalfUpDiv(5000, 10000)).toBe(1);
    expect(roundHalfUpDiv(4999, 10000)).toBe(0);
  });

  it("rejects a negative numerator", () => {
    expect(() => roundHalfUpDiv(-1, 10)).toThrow(MoneyError);
  });
});

describe("line amounts", () => {
  it("multiplies a whole quantity", () => {
    expect(lineAmountMinor(1000, 45_000_000)).toBe(45_000_000);
  });

  it("rounds a fractional quantity half up", () => {
    expect(lineAmountMinor(2500, 3_500_000)).toBe(8_750_000);
    expect(lineAmountMinor(1, 500)).toBe(1);
    expect(lineAmountMinor(1, 499)).toBe(0);
  });
});

describe("VAT, discount, and totals", () => {
  it("charges Nigeria VAT of 7.5% on a taxable line", () => {
    const totals = computeTotals(
      [{ quantityMilli: 1000, unitPriceMinor: 10_000, taxable: true }],
      { kind: "none" },
      750,
    );
    expect(totals).toEqual({
      subtotalMinor: 10_000,
      discountMinor: 0,
      netMinor: 10_000,
      taxableMinor: 10_000,
      taxMinor: 750,
      totalMinor: 10_750,
    });
  });

  it("rounds 7.5% of 0.20 half up to 0.02", () => {
    // 20 minor * 750 = 15_000. Divided by 10_000 the remainder is exactly half.
    const totals = computeTotals(
      [{ quantityMilli: 1000, unitPriceMinor: 20, taxable: true }],
      { kind: "none" },
      750,
    );
    expect(totals.taxMinor).toBe(2);
    expect(totals.totalMinor).toBe(22);
  });

  it("drops a tax fraction below half a kobo", () => {
    const totals = computeTotals(
      [{ quantityMilli: 1000, unitPriceMinor: 1, taxable: true }],
      { kind: "none" },
      750,
    );
    expect(totals.taxMinor).toBe(0);
    expect(totals.totalMinor).toBe(1);
  });

  it("applies a percent discount before VAT", () => {
    const totals = computeTotals(
      [{ quantityMilli: 1000, unitPriceMinor: 10_000, taxable: true }],
      { kind: "percent", basisPoints: 1000 },
      750,
    );
    expect(totals.discountMinor).toBe(1_000);
    expect(totals.netMinor).toBe(9_000);
    expect(totals.taxMinor).toBe(675);
    expect(totals.totalMinor).toBe(9_675);
  });

  it("rounds the percent discount itself half up", () => {
    const discount = discountMinorFor(10_001, { kind: "percent", basisPoints: 1000 });
    expect(discount).toBe(1_000);
  });

  it("caps a fixed discount at the subtotal and charges no VAT", () => {
    const totals = computeTotals(
      [{ quantityMilli: 1000, unitPriceMinor: 5_000, taxable: true }],
      { kind: "amount", minor: 9_000 },
      750,
    );
    expect(totals.discountMinor).toBe(5_000);
    expect(totals.netMinor).toBe(0);
    expect(totals.taxMinor).toBe(0);
    expect(totals.totalMinor).toBe(0);
  });

  it("allocates a discount across taxable and non-taxable lines", () => {
    const totals = computeTotals(
      [
        { quantityMilli: 1000, unitPriceMinor: 8_000, taxable: true },
        { quantityMilli: 1000, unitPriceMinor: 2_000, taxable: false },
      ],
      { kind: "percent", basisPoints: 1000 },
      750,
    );
    expect(totals.subtotalMinor).toBe(10_000);
    expect(totals.discountMinor).toBe(1_000);
    expect(totals.taxableMinor).toBe(7_200);
    expect(totals.taxMinor).toBe(540);
    expect(totals.totalMinor).toBe(9_540);
  });

  it("charges no tax when every line is exempt", () => {
    const totals = computeTotals(
      [{ quantityMilli: 2000, unitPriceMinor: 4_000, taxable: false }],
      { kind: "amount", minor: 1_000 },
      750,
    );
    expect(totals.subtotalMinor).toBe(8_000);
    expect(totals.taxMinor).toBe(0);
    expect(totals.totalMinor).toBe(7_000);
  });

  it("returns zeros for an empty document", () => {
    expect(computeTotals([], { kind: "none" }, 750).totalMinor).toBe(0);
  });

  it("rejects a discount above 100 percent", () => {
    expect(() =>
      computeTotals(
        [{ quantityMilli: 1000, unitPriceMinor: 100, taxable: true }],
        { kind: "percent", basisPoints: 10_001 },
        750,
      ),
    ).toThrow(MoneyError);
  });

  it("matches the seeded Atlantic Schools invoice", () => {
    const totals = computeTotals(
      [
        { quantityMilli: 1000, unitPriceMinor: 120_000_000, taxable: true },
        { quantityMilli: 1000, unitPriceMinor: 45_000_000, taxable: true },
      ],
      { kind: "percent", basisPoints: 500 },
      750,
    );
    expect(totals.subtotalMinor).toBe(165_000_000);
    expect(totals.discountMinor).toBe(8_250_000);
    expect(totals.taxMinor).toBe(11_756_250);
    expect(totals.totalMinor).toBe(168_506_250);
  });
});

describe("parsing money and quantities", () => {
  it("parses major units with commas and two decimals", () => {
    expect(parseMajorToMinor("1,200,000.00")).toBe(120_000_000);
    expect(parseMajorToMinor("100")).toBe(10_000);
    expect(parseMajorToMinor("100.5")).toBe(10_050);
    expect(parseMajorToMinor("100.555")).toBeNull();
    expect(parseMajorToMinor("-1")).toBeNull();
  });

  it("parses quantities to thousandths", () => {
    expect(parseQuantityMilli("2.5")).toBe(2500);
    expect(parseQuantityMilli("0.001")).toBe(1);
    expect(parseQuantityMilli("0")).toBeNull();
    expect(parseQuantityMilli("1.2345")).toBeNull();
    expect(formatQuantity(2500)).toBe("2.5");
    expect(formatMajorInput(10_050)).toBe("100.50");
  });
});
