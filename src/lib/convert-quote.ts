import { addISODays, isISODate } from "./dates";
import { computeTotals, type Discount, type DocumentTotals, type LineInput } from "./money";
import type { StoredQuoteStatus } from "./status";

export type QuoteLineSnapshot = LineInput & {
  description: string;
  productId: string | null;
  position: number;
};

export type QuoteSnapshot = {
  id: string;
  number: string;
  status: StoredQuoteStatus;
  clientId: string;
  currency: string;
  taxName: string;
  taxRateBps: number;
  discount: Discount;
  notes: string;
  terms: string;
  issueDate: string;
  validUntil: string;
  lines: QuoteLineSnapshot[];
};

export type InvoiceDraft = {
  quoteId: string;
  quoteNumber: string;
  clientId: string;
  currency: string;
  taxName: string;
  taxRateBps: number;
  discount: Discount;
  notes: string;
  terms: string;
  lines: QuoteLineSnapshot[];
  number: string;
  status: "draft";
  issueDate: string;
  dueDate: string;
  totals: DocumentTotals;
};

export class ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConversionError";
  }
}

const CONVERTIBLE = new Set<StoredQuoteStatus>(["draft", "sent", "accepted"]);

export function convertQuoteToInvoice(
  quote: QuoteSnapshot,
  options: {
    invoiceNumber: string;
    issueDate: string;
    paymentTermsDays: number;
    today: string;
  },
): InvoiceDraft {
  if (quote.status === "converted") {
    throw new ConversionError("This quote has already been converted.");
  }
  if (!CONVERTIBLE.has(quote.status)) {
    throw new ConversionError(`A ${quote.status} quote cannot be converted.`);
  }
  if (quote.status === "sent" && quote.validUntil < options.today) {
    throw new ConversionError("This quote has expired.");
  }
  if (quote.lines.length === 0) {
    throw new ConversionError("Add a line item before converting.");
  }
  if (!isISODate(options.issueDate) || !isISODate(options.today)) {
    throw new ConversionError("Issue date is invalid.");
  }
  if (!Number.isInteger(options.paymentTermsDays) || options.paymentTermsDays < 0) {
    throw new ConversionError("Payment terms must be zero or more days.");
  }
  if (!options.invoiceNumber.trim()) {
    throw new ConversionError("Invoice number is missing.");
  }

  const totals = computeTotals(quote.lines, quote.discount, quote.taxRateBps);

  return {
    quoteId: quote.id,
    quoteNumber: quote.number,
    clientId: quote.clientId,
    currency: quote.currency,
    taxName: quote.taxName,
    taxRateBps: quote.taxRateBps,
    discount: quote.discount,
    notes: quote.notes,
    terms: quote.terms,
    lines: quote.lines.map((line) => ({ ...line })),
    number: options.invoiceNumber,
    status: "draft",
    issueDate: options.issueDate,
    dueDate: addISODays(options.issueDate, options.paymentTermsDays),
    totals,
  };
}
