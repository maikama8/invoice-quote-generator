import { describe, expect, it } from "vitest";
import {
  effectiveInvoiceStatus,
  effectiveQuoteStatus,
  summarizeInvoices,
  summarizeQuotes,
} from "../src/lib/status";

describe("effective status", () => {
  it("keeps a sent invoice current through the due date", () => {
    expect(effectiveInvoiceStatus("sent", "2026-11-02", "2026-11-02")).toBe("sent");
    expect(effectiveInvoiceStatus("sent", "2026-11-03", "2026-11-02")).toBe("sent");
  });

  it("marks a sent invoice overdue the day after it is due", () => {
    expect(effectiveInvoiceStatus("sent", "2026-11-01", "2026-11-02")).toBe("overdue");
    expect(effectiveInvoiceStatus("overdue", "2026-10-01", "2026-11-02")).toBe("overdue");
  });

  it("shows sent again when an overdue due date is moved forward", () => {
    expect(effectiveInvoiceStatus("overdue", "2026-11-20", "2026-11-02")).toBe("sent");
  });

  it("leaves paid and draft alone", () => {
    expect(effectiveInvoiceStatus("paid", "2026-01-01", "2026-11-02")).toBe("paid");
    expect(effectiveInvoiceStatus("draft", "2026-01-01", "2026-11-02")).toBe("draft");
  });

  it("expires a sent quote after its valid-until date", () => {
    expect(effectiveQuoteStatus("sent", "2026-11-01", "2026-11-02")).toBe("expired");
    expect(effectiveQuoteStatus("sent", "2026-11-02", "2026-11-02")).toBe("sent");
    expect(effectiveQuoteStatus("accepted", "2026-10-01", "2026-11-02")).toBe("accepted");
    expect(effectiveQuoteStatus("draft", "2026-10-01", "2026-11-02")).toBe("draft");
  });
});

describe("dashboard totals", () => {
  const today = "2026-11-02";

  it("splits outstanding, overdue, paid, and draft without mixing currencies", () => {
    const buckets = summarizeInvoices(
      [
        { currency: "NGN", totalMinor: 100, status: "sent", dueDate: "2026-11-10" },
        { currency: "NGN", totalMinor: 40, status: "sent", dueDate: "2026-10-01" },
        { currency: "NGN", totalMinor: 7, status: "overdue", dueDate: "2026-12-01" },
        { currency: "NGN", totalMinor: 5, status: "paid", dueDate: "2026-10-01" },
        { currency: "NGN", totalMinor: 9, status: "draft", dueDate: "2026-11-01" },
        { currency: "USD", totalMinor: 250, status: "paid", dueDate: "2026-11-01" },
      ],
      today,
      ["NGN", "USD"],
    );

    const ngn = buckets.find((bucket) => bucket.currency === "NGN");
    const usd = buckets.find((bucket) => bucket.currency === "USD");
    // The stored "overdue" invoice whose due date was moved forward counts as sent.
    expect(ngn).toMatchObject({
      outstandingMinor: 147,
      overdueMinor: 40,
      paidMinor: 5,
      draftMinor: 9,
      outstandingCount: 3,
      overdueCount: 1,
      paidCount: 1,
    });
    expect(usd).toMatchObject({
      outstandingMinor: 0,
      paidMinor: 250,
      paidCount: 1,
    });
  });

  it("counts open quotes as drafts plus quotes still in date", () => {
    const summary = summarizeQuotes(
      [
        { status: "draft", validUntil: "2026-10-01" },
        { status: "sent", validUntil: "2026-11-20" },
        { status: "sent", validUntil: "2026-10-01" },
        { status: "accepted", validUntil: "2026-10-01" },
        { status: "converted", validUntil: "2026-10-01" },
        { status: "declined", validUntil: "2026-12-01" },
      ],
      today,
    );
    expect(summary).toEqual({
      open: 2,
      draft: 1,
      accepted: 1,
      converted: 1,
      declined: 1,
      expired: 1,
    });
  });
});
