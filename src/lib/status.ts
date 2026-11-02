export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "converted";

export type StoredQuoteStatus = Exclude<QuoteStatus, "expired">;

/**
 * A sent or overdue invoice is overdue once the due date is before today.
 * The due date itself is still on time. Paid and draft never move.
 */
export function effectiveInvoiceStatus(
  status: InvoiceStatus,
  dueDate: string,
  today: string,
): InvoiceStatus {
  if (status === "draft" || status === "paid") return status;
  return dueDate < today ? "overdue" : "sent";
}

/**
 * A sent quote expires the day after `validUntil`. Accepted quotes stay
 * accepted so they can still be converted. Drafts do not expire.
 */
export function effectiveQuoteStatus(
  status: StoredQuoteStatus,
  validUntil: string,
  today: string,
): QuoteStatus {
  if (status === "sent" && validUntil < today) return "expired";
  return status;
}

export type InvoiceSummaryInput = {
  currency: string;
  totalMinor: number;
  status: InvoiceStatus;
  dueDate: string;
};

export type MoneyBucket = {
  currency: string;
  outstandingMinor: number;
  overdueMinor: number;
  paidMinor: number;
  draftMinor: number;
  outstandingCount: number;
  overdueCount: number;
  paidCount: number;
  draftCount: number;
};

export function summarizeInvoices(
  invoices: readonly InvoiceSummaryInput[],
  today: string,
  currencies: readonly string[],
): MoneyBucket[] {
  const buckets = new Map<string, MoneyBucket>();
  for (const currency of currencies) {
    buckets.set(currency, emptyBucket(currency));
  }
  for (const invoice of invoices) {
    const bucket = buckets.get(invoice.currency) ?? emptyBucket(invoice.currency);
    const status = effectiveInvoiceStatus(invoice.status, invoice.dueDate, today);
    if (status === "paid") {
      bucket.paidMinor += invoice.totalMinor;
      bucket.paidCount += 1;
    } else if (status === "draft") {
      bucket.draftMinor += invoice.totalMinor;
      bucket.draftCount += 1;
    } else {
      bucket.outstandingMinor += invoice.totalMinor;
      bucket.outstandingCount += 1;
      if (status === "overdue") {
        bucket.overdueMinor += invoice.totalMinor;
        bucket.overdueCount += 1;
      }
    }
    buckets.set(invoice.currency, bucket);
  }
  return [...buckets.values()];
}

function emptyBucket(currency: string): MoneyBucket {
  return {
    currency,
    outstandingMinor: 0,
    overdueMinor: 0,
    paidMinor: 0,
    draftMinor: 0,
    outstandingCount: 0,
    overdueCount: 0,
    paidCount: 0,
    draftCount: 0,
  };
}

export type QuoteSummaryInput = {
  status: StoredQuoteStatus;
  validUntil: string;
};

export type QuoteSummary = {
  open: number;
  accepted: number;
  converted: number;
  declined: number;
  expired: number;
  draft: number;
};

export function summarizeQuotes(
  quotes: readonly QuoteSummaryInput[],
  today: string,
): QuoteSummary {
  const summary: QuoteSummary = {
    open: 0,
    accepted: 0,
    converted: 0,
    declined: 0,
    expired: 0,
    draft: 0,
  };
  for (const quote of quotes) {
    const status = effectiveQuoteStatus(quote.status, quote.validUntil, today);
    if (status === "draft") {
      summary.draft += 1;
      summary.open += 1;
    } else if (status === "sent") {
      summary.open += 1;
    } else if (status === "accepted") {
      summary.accepted += 1;
    } else if (status === "converted") {
      summary.converted += 1;
    } else if (status === "declined") {
      summary.declined += 1;
    } else if (status === "expired") {
      summary.expired += 1;
    }
  }
  return summary;
}
