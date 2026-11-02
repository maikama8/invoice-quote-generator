import { isCurrencyCode, type CurrencyCode } from "./currencies";
import { isISODate } from "./dates";
import {
  computeTotals,
  formatMajorInput,
  formatQuantity,
  lineAmountMinor,
  MoneyError,
  parseMajorToMinor,
  parseQuantityMilli,
  type Discount,
  type DocumentTotals,
} from "./money";

export type LineDraft = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
  productId: string | null;
};

export type DocumentFormValues = {
  clientId: string;
  currency: string;
  issueDate: string;
  endDate: string;
  discountKind: "none" | "percent" | "amount";
  discountValue: string;
  notes: string;
  terms: string;
  lines: LineDraft[];
};

export type ParsedLine = {
  position: number;
  description: string;
  quantityMilli: number;
  unitPriceMinor: number;
  taxable: boolean;
  productId: string | null;
  amountMinor: number;
};

export type ParsedDocument = {
  clientId: string;
  currency: CurrencyCode;
  issueDate: string;
  endDate: string;
  discount: Discount;
  notes: string;
  terms: string;
  lines: ParsedLine[];
  totals: DocumentTotals;
};

export type ParseResult =
  | { ok: true; value: ParsedDocument }
  | { ok: false; message: string };

const MAX_LINES = 40;

export function emptyDocumentValues(input: {
  currency: string;
  issueDate: string;
  endDate: string;
  terms: string;
}): DocumentFormValues {
  return {
    clientId: "",
    currency: input.currency,
    issueDate: input.issueDate,
    endDate: input.endDate,
    discountKind: "none",
    discountValue: "",
    notes: "",
    terms: input.terms,
    lines: [
      {
        description: "",
        quantity: "1",
        unitPrice: "",
        taxable: true,
        productId: null,
      },
    ],
  };
}

export function editorValuesFrom(document: {
  clientId: string;
  currency: string;
  issueDate: string;
  endDate: string;
  discount: Discount;
  notes: string;
  terms: string;
  lines: Array<{
    description: string;
    quantityMilli: number;
    unitPriceMinor: number;
    taxable: boolean;
    productId: string | null;
  }>;
}): DocumentFormValues {
  let discountKind: DocumentFormValues["discountKind"] = "none";
  let discountValue = "";
  if (document.discount.kind === "percent") {
    discountKind = "percent";
    discountValue = formatPercentInput(document.discount.basisPoints);
  } else if (document.discount.kind === "amount") {
    discountKind = "amount";
    discountValue = formatMajorInput(document.discount.minor);
  }
  return {
    clientId: document.clientId,
    currency: document.currency,
    issueDate: document.issueDate,
    endDate: document.endDate,
    discountKind,
    discountValue,
    notes: document.notes,
    terms: document.terms,
    lines: document.lines.map((line) => ({
      description: line.description,
      quantity: formatQuantity(line.quantityMilli),
      unitPrice: formatMajorInput(line.unitPriceMinor),
      taxable: line.taxable,
      productId: line.productId,
    })),
  };
}

export function formatPercentInput(basisPoints: number): string {
  const percent = basisPoints / 100;
  if (Number.isInteger(percent)) return String(percent);
  return percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function parsePercentToBps(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const basisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(basisPoints) || basisPoints > 10_000) return null;
  return basisPoints;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseDocumentInput(input: unknown, taxRateBps: number): ParseResult {
  if (!isRecord(input)) return { ok: false, message: "The document could not be read." };
  const clientId = typeof input.clientId === "string" ? input.clientId.trim() : "";
  if (!clientId) return { ok: false, message: "Choose a client." };

  const currency = typeof input.currency === "string" ? input.currency : "";
  if (!isCurrencyCode(currency)) return { ok: false, message: "Choose a currency." };

  const issueDate = typeof input.issueDate === "string" ? input.issueDate : "";
  const endDate = typeof input.endDate === "string" ? input.endDate : "";
  if (!isISODate(issueDate) || !isISODate(endDate)) {
    return { ok: false, message: "Enter valid dates." };
  }
  if (endDate < issueDate) {
    return { ok: false, message: "The due or valid-until date is before the issue date." };
  }

  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  const terms = typeof input.terms === "string" ? input.terms.trim() : "";
  if (notes.length > 2000 || terms.length > 2000) {
    return { ok: false, message: "Notes and terms must be 2000 characters or fewer." };
  }

  const discountKind = input.discountKind;
  const discountValue = typeof input.discountValue === "string" ? input.discountValue : "";
  let discount: Discount;
  if (discountKind === "none" || discountKind === undefined) {
    discount = { kind: "none" };
  } else if (discountKind === "percent") {
    const basisPoints = parsePercentToBps(discountValue);
    if (basisPoints === null) {
      return { ok: false, message: "Enter a discount percent from 0 to 100, with up to two decimals." };
    }
    discount = { kind: "percent", basisPoints };
  } else if (discountKind === "amount") {
    const minor = parseMajorToMinor(discountValue);
    if (minor === null) {
      return { ok: false, message: "Enter a discount amount with up to two decimals." };
    }
    discount = { kind: "amount", minor };
  } else {
    return { ok: false, message: "Choose a discount." };
  }

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return { ok: false, message: "Add a line item." };
  }
  if (input.lines.length > MAX_LINES) {
    return { ok: false, message: `A document can have at most ${MAX_LINES} lines.` };
  }

  const lines: ParsedLine[] = [];
  for (let index = 0; index < input.lines.length; index += 1) {
    const raw = input.lines[index];
    if (!isRecord(raw)) return { ok: false, message: `Line ${index + 1} could not be read.` };
    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    if (!description) return { ok: false, message: `Line ${index + 1} needs a description.` };
    if (description.length > 240) {
      return { ok: false, message: `Line ${index + 1} description is too long.` };
    }
    const quantity = typeof raw.quantity === "string" ? raw.quantity : String(raw.quantity ?? "");
    const quantityMilli = parseQuantityMilli(quantity);
    if (quantityMilli === null) {
      return {
        ok: false,
        message: `Line ${index + 1} quantity must be greater than zero, with up to three decimals.`,
      };
    }
    const unitPrice = typeof raw.unitPrice === "string" ? raw.unitPrice : String(raw.unitPrice ?? "");
    const unitPriceMinor = parseMajorToMinor(unitPrice);
    if (unitPriceMinor === null) {
      return { ok: false, message: `Line ${index + 1} price must be zero or more, with up to two decimals.` };
    }
    const taxable = raw.taxable === true || raw.taxable === "true" || raw.taxable === "on";
    const productId = typeof raw.productId === "string" && raw.productId.trim() ? raw.productId.trim() : null;
    lines.push({
      position: index,
      description,
      quantityMilli,
      unitPriceMinor,
      taxable,
      productId,
      amountMinor: lineAmountMinor(quantityMilli, unitPriceMinor),
    });
  }

  try {
    const totals = computeTotals(lines, discount, taxRateBps);
    return {
      ok: true,
      value: { clientId, currency, issueDate, endDate, discount, notes, terms, lines, totals },
    };
  } catch (error) {
    if (error instanceof MoneyError) return { ok: false, message: error.message };
    throw error;
  }
}
