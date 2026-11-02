import { BPS_SCALE, MINOR_SCALE, QTY_SCALE } from "./constants";

export type Discount =
  | { kind: "none" }
  | { kind: "percent"; basisPoints: number }
  | { kind: "amount"; minor: number };

export type LineInput = {
  quantityMilli: number;
  unitPriceMinor: number;
  taxable: boolean;
};

export type DocumentTotals = {
  subtotalMinor: number;
  discountMinor: number;
  netMinor: number;
  taxableMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

function assertSafeNonNegative(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MoneyError(`${label} must be a non-negative integer`);
  }
}

/**
 * Divide and round half away from zero on the midpoint (.5).
 * Invoice VAT uses this, not banker's rounding, so 0.5 kobo becomes 1.
 */
export function roundHalfUpDiv(numerator: number, denominator: number): number {
  assertSafeNonNegative(numerator, "numerator");
  if (!Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new MoneyError("denominator must be a positive integer");
  }
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  if (remainder * 2 >= denominator) return quotient + 1;
  return quotient;
}

export function lineAmountMinor(quantityMilli: number, unitPriceMinor: number): number {
  assertSafeNonNegative(quantityMilli, "quantity");
  assertSafeNonNegative(unitPriceMinor, "unit price");
  const product = quantityMilli * unitPriceMinor;
  if (!Number.isSafeInteger(product)) {
    throw new MoneyError("Line amount is too large to round safely");
  }
  return roundHalfUpDiv(product, QTY_SCALE);
}

export function discountMinorFor(subtotalMinor: number, discount: Discount): number {
  assertSafeNonNegative(subtotalMinor, "subtotal");
  if (discount.kind === "none") return 0;
  if (discount.kind === "percent") {
    assertSafeNonNegative(discount.basisPoints, "discount rate");
    if (discount.basisPoints > BPS_SCALE) {
      throw new MoneyError("Discount percent cannot exceed 100");
    }
    return roundHalfUpDiv(subtotalMinor * discount.basisPoints, BPS_SCALE);
  }
  assertSafeNonNegative(discount.minor, "discount amount");
  return Math.min(discount.minor, subtotalMinor);
}

export function computeTotals(
  lines: readonly LineInput[],
  discount: Discount,
  taxRateBps: number,
): DocumentTotals {
  assertSafeNonNegative(taxRateBps, "tax rate");
  if (taxRateBps > BPS_SCALE) {
    throw new MoneyError("Tax rate cannot exceed 100%");
  }

  let subtotalMinor = 0;
  let taxableSubtotalMinor = 0;
  for (const line of lines) {
    const amount = lineAmountMinor(line.quantityMilli, line.unitPriceMinor);
    subtotalMinor += amount;
    if (line.taxable) taxableSubtotalMinor += amount;
  }
  if (!Number.isSafeInteger(subtotalMinor)) {
    throw new MoneyError("Subtotal is too large");
  }

  const discountMinor = discountMinorFor(subtotalMinor, discount);
  const netMinor = subtotalMinor - discountMinor;

  let taxableDiscountMinor = 0;
  if (subtotalMinor > 0 && taxableSubtotalMinor > 0 && discountMinor > 0) {
    const product = discountMinor * taxableSubtotalMinor;
    if (!Number.isSafeInteger(product)) {
      throw new MoneyError("Discount allocation is too large");
    }
    taxableDiscountMinor = roundHalfUpDiv(product, subtotalMinor);
    if (taxableDiscountMinor > taxableSubtotalMinor) {
      taxableDiscountMinor = taxableSubtotalMinor;
    }
  }

  const taxableMinor = taxableSubtotalMinor - taxableDiscountMinor;
  const taxProduct = taxableMinor * taxRateBps;
  if (!Number.isSafeInteger(taxProduct)) {
    throw new MoneyError("Tax amount is too large");
  }
  const taxMinor = roundHalfUpDiv(taxProduct, BPS_SCALE);
  const totalMinor = netMinor + taxMinor;

  return {
    subtotalMinor,
    discountMinor,
    netMinor,
    taxableMinor,
    taxMinor,
    totalMinor,
  };
}

export function parseMajorToMinor(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  if (fraction.length > 2) return null;
  const minor = Number(whole) * MINOR_SCALE + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

export function parseQuantityMilli(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const milli = Number(whole) * QTY_SCALE + Number(fraction.padEnd(3, "0"));
  if (!Number.isSafeInteger(milli) || milli <= 0 || milli > 1_000_000_000) return null;
  return milli;
}

export function formatQuantity(quantityMilli: number): string {
  assertSafeNonNegative(quantityMilli, "quantity");
  const whole = Math.floor(quantityMilli / QTY_SCALE);
  const fraction = quantityMilli % QTY_SCALE;
  if (fraction === 0) return String(whole);
  return `${whole}.${String(fraction).padStart(3, "0").replace(/0+$/, "")}`;
}

export function formatMajorInput(minor: number): string {
  assertSafeNonNegative(minor, "amount");
  const whole = Math.floor(minor / MINOR_SCALE);
  const fraction = minor % MINOR_SCALE;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}
