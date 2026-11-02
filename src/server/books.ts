import "server-only";
import { revalidatePath } from "next/cache";
import type { PrismaClient } from "@/generated/prisma/client";
import { appConfig } from "@/lib/config";
import { NIGERIA_VAT_BPS } from "@/lib/constants";
import { convertQuoteToInvoice, ConversionError, type QuoteSnapshot } from "@/lib/convert-quote";
import { sortCurrencies } from "@/lib/currencies";
import { todayISO, yearOf } from "@/lib/dates";
import { parseDocumentInput, type ParsedDocument } from "@/lib/document-input";
import { computeTotals, lineAmountMinor, type Discount } from "@/lib/money";
import { formatDocumentNumber, nextSequence, NumberingError } from "@/lib/numbering";
import { resolvePaymentLink, type PaymentLink } from "@/lib/payments";
import {
  effectiveInvoiceStatus,
  effectiveQuoteStatus,
  summarizeInvoices,
  summarizeQuotes,
  type InvoiceStatus,
  type QuoteSummary,
  type StoredQuoteStatus,
} from "@/lib/status";
import type { MutationResult } from "@/lib/result";
import {
  clientTitle,
  type BusinessProfile,
  type CommercialDocument,
  type DocumentLineView,
  type DocumentRow,
  type CatalogueItem,
  type Party,
} from "@/lib/views";
import { requestDb } from "./request";

export type { MutationResult };

type SettingsRow = {
  legalName: string;
  tradingName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  tin: string;
  logoDataUrl: string;
  defaultCurrency: string;
  taxName: string;
  taxRateBps: number;
  invoicePrefix: string;
  quotePrefix: string;
  numberWidth: number;
  paymentTermsDays: number;
  footerNote: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentProvider: string;
};

const quoteInclude = {
  client: true,
  lines: { orderBy: { position: "asc" as const } },
  invoice: { select: { id: true, number: true } },
} as const;

const invoiceInclude = {
  client: true,
  lines: { orderBy: { position: "asc" as const } },
  quote: { select: { id: true, number: true } },
} as const;

export async function getBusiness(): Promise<BusinessProfile> {
  const db = await requestDb();
  return toProfile(await ensureSettings(db));
}

export async function getClients(): Promise<Party[]> {
  const db = await requestDb();
  const rows = await db.client.findMany({ orderBy: [{ company: "asc" }, { name: "asc" }] });
  return rows.map(toParty);
}

export async function getClient(id: string): Promise<Party | null> {
  const db = await requestDb();
  const row = await db.client.findUnique({ where: { id } });
  return row ? toParty(row) : null;
}

export async function getCatalogue(): Promise<CatalogueItem[]> {
  const db = await requestDb();
  const rows = await db.product.findMany({ orderBy: { name: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    unitPriceMinor: asMinor(row.unitPriceMinor),
    currency: row.currency,
    unit: row.unit,
    taxable: row.taxable,
    active: row.active,
  }));
}

export async function getQuote(id: string): Promise<CommercialDocument | null> {
  const { db, today } = await clock();
  const row = await db.quote.findUnique({ where: { id }, include: quoteInclude });
  if (!row) return null;
  return quoteDocument(row, today);
}

export async function getInvoice(id: string): Promise<CommercialDocument | null> {
  const { db, today } = await clock();
  const row = await db.invoice.findUnique({ where: { id }, include: invoiceInclude });
  if (!row) return null;
  return invoiceDocument(row, today);
}

export async function listQuotes(status?: string): Promise<DocumentRow[]> {
  const { db, today } = await clock();
  const rows = await db.quote.findMany({
    include: { client: true },
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
  });
  return rows
    .map((row) => ({
      id: row.id,
      number: row.number,
      clientName: clientTitle(row.client),
      status: effectiveQuoteStatus(asQuoteStatus(row.status), row.validUntil, today),
      issueDate: row.issueDate,
      endDate: row.validUntil,
      currency: row.currency,
      totalMinor: asMinor(row.totalMinor),
    }))
    .filter((row) => !status || status === "all" || row.status === status);
}

export async function listInvoices(status?: string): Promise<DocumentRow[]> {
  const { db, today } = await clock();
  const rows = await db.invoice.findMany({
    include: { client: true },
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
  });
  return rows
    .map((row) => ({
      id: row.id,
      number: row.number,
      clientName: clientTitle(row.client),
      status: effectiveInvoiceStatus(asInvoiceStatus(row.status), row.dueDate, today),
      issueDate: row.issueDate,
      endDate: row.dueDate,
      currency: row.currency,
      totalMinor: asMinor(row.totalMinor),
    }))
    .filter((row) => !status || status === "all" || row.status === status);
}

export async function getDashboard() {
  const { db, today } = await clock();
  const settings = toProfile(await ensureSettings(db));
  const [invoices, quotes] = await Promise.all([
    db.invoice.findMany({ include: { client: true }, orderBy: [{ issueDate: "desc" }, { number: "desc" }] }),
    db.quote.findMany({ include: { client: true }, orderBy: [{ issueDate: "desc" }, { number: "desc" }] }),
  ]);
  const invoiceRows = invoices.map((row) => ({
    currency: row.currency,
    totalMinor: asMinor(row.totalMinor),
    status: asInvoiceStatus(row.status),
    dueDate: row.dueDate,
  }));
  const currencies = sortCurrencies([
    settings.defaultCurrency,
    ...invoiceRows.map((row) => row.currency),
  ]);
  const buckets = summarizeInvoices(invoiceRows, today, currencies);
  const quoteSummary: QuoteSummary = summarizeQuotes(
    quotes.map((row) => ({ status: asQuoteStatus(row.status), validUntil: row.validUntil })),
    today,
  );
  const recentInvoices: DocumentRow[] = invoices.slice(0, 6).map((row) => ({
    id: row.id,
    number: row.number,
    clientName: clientTitle(row.client),
    status: effectiveInvoiceStatus(asInvoiceStatus(row.status), row.dueDate, today),
    issueDate: row.issueDate,
    endDate: row.dueDate,
    currency: row.currency,
    totalMinor: asMinor(row.totalMinor),
  }));
  const attention = recentInvoices.filter((row) => row.status === "overdue");
  const overdueAll = invoices
    .map((row) => ({
      id: row.id,
      number: row.number,
      clientName: clientTitle(row.client),
      status: effectiveInvoiceStatus(asInvoiceStatus(row.status), row.dueDate, today),
      issueDate: row.issueDate,
      endDate: row.dueDate,
      currency: row.currency,
      totalMinor: asMinor(row.totalMinor),
    }))
    .filter((row) => row.status === "overdue");
  const recentQuotes: DocumentRow[] = quotes.slice(0, 5).map((row) => ({
    id: row.id,
    number: row.number,
    clientName: clientTitle(row.client),
    status: effectiveQuoteStatus(asQuoteStatus(row.status), row.validUntil, today),
    issueDate: row.issueDate,
    endDate: row.validUntil,
    currency: row.currency,
    totalMinor: asMinor(row.totalMinor),
  }));
  return {
    settings,
    today,
    buckets,
    quoteSummary,
    recentInvoices,
    recentQuotes,
    attention: overdueAll.length > 0 ? overdueAll : attention,
  };
}

export async function paymentLinkFor(invoice: CommercialDocument): Promise<PaymentLink> {
  const settings = await getBusiness();
  const config = appConfig();
  const publicKey =
    settings.paymentProvider === "paystack"
      ? config.paystackPublicKey
      : settings.paymentProvider === "flutterwave"
        ? config.flutterwavePublicKey
        : "";
  return resolvePaymentLink({
    linksEnabled: config.paymentLinksEnabled,
    provider: settings.paymentProvider,
    reference: invoice.number,
    amountMinor: invoice.totals.totalMinor,
    currency: invoice.currency,
    customerEmail: invoice.client.email,
    publicKey,
  });
}

export async function healthcheck() {
  const db = await requestDb();
  const [invoices, quotes, clients] = await Promise.all([
    db.invoice.count(),
    db.quote.count(),
    db.client.count(),
  ]);
  return { status: "ok" as const, invoices, quotes, clients };
}

export async function saveClient(
  id: string | null,
  input: {
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    notes: string;
  },
): Promise<MutationResult> {
  const name = input.name.trim();
  const company = input.company.trim();
  if (!name && !company) return { ok: false, message: "Enter a person or a company." };
  const email = input.email.trim();
  if (email && !email.includes("@")) return { ok: false, message: "Enter a valid email, or leave it blank." };
  const data = {
    name: name || company,
    company,
    email,
    phone: input.phone.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    country: input.country.trim() || "Nigeria",
    notes: input.notes.trim(),
  };
  const db = await requestDb();
  const row = id
    ? await db.client.update({ where: { id }, data })
    : await db.client.create({ data });
  refresh("/");
  refresh("/clients");
  return { ok: true, href: `/clients/${row.id}` };
}

export async function removeClient(id: string): Promise<MutationResult> {
  const db = await requestDb();
  const [quotes, invoices] = await Promise.all([
    db.quote.count({ where: { clientId: id } }),
    db.invoice.count({ where: { clientId: id } }),
  ]);
  if (quotes + invoices > 0) {
    return { ok: false, message: "This client has quotes or invoices, so the record stays." };
  }
  await db.client.delete({ where: { id } });
  refresh("/clients");
  return { ok: true, href: "/clients" };
}

export async function saveProduct(
  id: string | null,
  input: {
    sku: string;
    name: string;
    description: string;
    unitPrice: string;
    currency: string;
    unit: string;
    taxable: boolean;
    active: boolean;
  },
): Promise<MutationResult> {
  const sku = input.sku.trim().toUpperCase();
  const name = input.name.trim();
  if (!/^[A-Z0-9][A-Z0-9-]{1,23}$/.test(sku)) {
    return { ok: false, message: "SKU must be 2–24 letters, digits, or hyphens." };
  }
  if (!name) return { ok: false, message: "Enter a product name." };
  const { parseMajorToMinor } = await import("@/lib/money");
  const { isCurrencyCode } = await import("@/lib/currencies");
  const unitPriceMinor = parseMajorToMinor(input.unitPrice);
  if (unitPriceMinor === null) return { ok: false, message: "Enter a unit price with up to two decimals." };
  if (!isCurrencyCode(input.currency)) return { ok: false, message: "Choose a currency." };
  const data = {
    sku,
    name,
    description: input.description.trim(),
    unitPriceMinor: BigInt(unitPriceMinor),
    currency: input.currency,
    unit: input.unit.trim() || "item",
    taxable: input.taxable,
    active: input.active,
  };
  const db = await requestDb();
  try {
    const row = id
      ? await db.product.update({ where: { id }, data })
      : await db.product.create({ data });
    refresh("/catalogue");
    return { ok: true, href: `/catalogue#${row.id}` };
  } catch (error) {
    if (prismaCode(error) === "P2002") return { ok: false, message: "That SKU is already in the catalogue." };
    throw error;
  }
}

export async function removeProduct(id: string): Promise<MutationResult> {
  const db = await requestDb();
  await db.product.delete({ where: { id } });
  refresh("/catalogue");
  return { ok: true, href: "/catalogue" };
}

export async function saveSettings(input: {
  legalName: string;
  tradingName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  tin: string;
  defaultCurrency: string;
  taxName: string;
  taxRate: string;
  invoicePrefix: string;
  quotePrefix: string;
  numberWidth: string;
  paymentTermsDays: string;
  footerNote: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  paymentProvider: string;
  logoDataUrl?: string;
  removeLogo?: boolean;
}): Promise<MutationResult> {
  const { isCurrencyCode } = await import("@/lib/currencies");
  const { parsePercentToBps } = await import("@/lib/document-input");
  const { assertPrefix } = await import("@/lib/numbering");
  const legalName = input.legalName.trim();
  const tradingName = input.tradingName.trim();
  if (!legalName || !tradingName) return { ok: false, message: "Enter the legal name and the trading name." };
  if (!isCurrencyCode(input.defaultCurrency)) return { ok: false, message: "Choose a default currency." };
  const taxRateBps = parsePercentToBps(input.taxRate);
  if (taxRateBps === null) return { ok: false, message: "Enter a VAT rate from 0 to 100, with up to two decimals." };
  const taxName = input.taxName.trim();
  if (!taxName) return { ok: false, message: "Name the tax. VAT is the usual label." };
  let invoicePrefix: string;
  let quotePrefix: string;
  try {
    invoicePrefix = assertPrefix(input.invoicePrefix.trim().toUpperCase());
    quotePrefix = assertPrefix(input.quotePrefix.trim().toUpperCase());
  } catch (error) {
    if (error instanceof NumberingError) return { ok: false, message: error.message };
    throw error;
  }
  const numberWidth = Number(input.numberWidth);
  if (!Number.isInteger(numberWidth) || numberWidth < 1 || numberWidth > 8) {
    return { ok: false, message: "Number width must be from 1 to 8." };
  }
  const paymentTermsDays = Number(input.paymentTermsDays);
  if (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0 || paymentTermsDays > 365) {
    return { ok: false, message: "Payment terms must be from 0 to 365 days." };
  }
  const provider = ["none", "paystack", "flutterwave"].includes(input.paymentProvider)
    ? input.paymentProvider
    : "none";
  const db = await requestDb();
  const current = await ensureSettings(db);
  let logoDataUrl = current.logoDataUrl;
  if (input.removeLogo) logoDataUrl = "";
  if (input.logoDataUrl) logoDataUrl = input.logoDataUrl;
  await db.businessSettings.update({
    where: { id: 1 },
    data: {
      legalName,
      tradingName,
      email: input.email.trim(),
      phone: input.phone.trim(),
      address: input.address.trim(),
      website: input.website.trim(),
      tin: input.tin.trim(),
      defaultCurrency: input.defaultCurrency,
      taxName,
      taxRateBps,
      invoicePrefix,
      quotePrefix,
      numberWidth,
      paymentTermsDays,
      footerNote: input.footerNote.trim(),
      bankName: input.bankName.trim(),
      bankAccountName: input.bankAccountName.trim(),
      bankAccountNumber: input.bankAccountNumber.trim(),
      paymentProvider: provider,
      logoDataUrl,
    },
  });
  refresh("/");
  refresh("/settings");
  return { ok: true, href: "/settings" };
}

export async function createQuote(input: unknown): Promise<MutationResult> {
  const { db } = await clock();
  const settings = await ensureSettings(db);
  const parsed = parseDocumentInput(input, settings.taxRateBps);
  if (!parsed.ok) return parsed;
  const client = await db.client.findUnique({ where: { id: parsed.value.clientId } });
  if (!client) return { ok: false, message: "Choose a client." };
  try {
    const id = await db.$transaction(async (tx) => {
      const number = await allocateNumber(tx, "quote", parsed.value.issueDate, settings);
      const row = await tx.quote.create({
        data: quoteCreate(number, parsed.value, settings.taxName, settings.taxRateBps),
      });
      return row.id;
    });
    refresh("/quotes");
    refresh("/");
    return { ok: true, href: `/quotes/${id}` };
  } catch (error) {
    return persistError(error);
  }
}

export async function updateQuote(id: string, input: unknown): Promise<MutationResult> {
  const { db } = await clock();
  const existing = await db.quote.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Quote not found." };
  if (existing.status !== "draft") return { ok: false, message: "Only a draft quote can be edited." };
  const parsed = parseDocumentInput(input, existing.taxRateBps);
  if (!parsed.ok) return parsed;
  const client = await db.client.findUnique({ where: { id: parsed.value.clientId } });
  if (!client) return { ok: false, message: "Choose a client." };
  const columns = discountColumns(parsed.value.discount);
  await db.$transaction(async (tx) => {
    await tx.quoteLine.deleteMany({ where: { quoteId: id } });
    await tx.quote.update({
      where: { id },
      data: {
        clientId: parsed.value.clientId,
        currency: parsed.value.currency,
        issueDate: parsed.value.issueDate,
        validUntil: parsed.value.endDate,
        notes: parsed.value.notes,
        terms: parsed.value.terms,
        ...columns,
        subtotalMinor: BigInt(parsed.value.totals.subtotalMinor),
        discountTotalMinor: BigInt(parsed.value.totals.discountMinor),
        taxMinor: BigInt(parsed.value.totals.taxMinor),
        totalMinor: BigInt(parsed.value.totals.totalMinor),
        lines: { create: lineCreates(parsed.value) },
      },
    });
  });
  refresh(`/quotes/${id}`);
  refresh("/quotes");
  return { ok: true, href: `/quotes/${id}` };
}

export async function setQuoteStatus(id: string, next: string): Promise<MutationResult> {
  const { db, today } = await clock();
  const quote = await db.quote.findUnique({ where: { id } });
  if (!quote) return { ok: false, message: "Quote not found." };
  const current = effectiveQuoteStatus(asQuoteStatus(quote.status), quote.validUntil, today);
  const allowed: Record<string, string[]> = {
    draft: ["sent"],
    sent: ["accepted", "declined", "draft"],
    declined: ["draft"],
    expired: ["draft"],
  };
  if (!allowed[current]?.includes(next)) {
    return { ok: false, message: `A ${current} quote cannot be marked ${next}.` };
  }
  await db.quote.update({ where: { id }, data: { status: next === "expired" ? "sent" : next } });
  refresh(`/quotes/${id}`);
  refresh("/quotes");
  return { ok: true, href: `/quotes/${id}` };
}

export async function removeQuote(id: string): Promise<MutationResult> {
  const db = await requestDb();
  const quote = await db.quote.findUnique({ where: { id }, include: { invoice: true } });
  if (!quote) return { ok: false, message: "Quote not found." };
  if (quote.status !== "draft" || quote.invoice) {
    return { ok: false, message: "Only a draft that has not been converted can be deleted." };
  }
  await db.quote.delete({ where: { id } });
  refresh("/quotes");
  refresh("/");
  return { ok: true, href: "/quotes" };
}

export async function convertQuote(id: string): Promise<MutationResult> {
  const { db, today } = await clock();
  const settings = await ensureSettings(db);
  const quote = await db.quote.findUnique({ where: { id }, include: quoteInclude });
  if (!quote) return { ok: false, message: "Quote not found." };
  const snapshot = quoteSnapshot(quote);
  try {
    const invoiceId = await db.$transaction(async (tx) => {
      const number = await allocateNumber(tx, "invoice", today, settings);
      const draft = convertQuoteToInvoice(snapshot, {
        invoiceNumber: number,
        issueDate: today,
        paymentTermsDays: settings.paymentTermsDays,
        today,
      });
      const columns = discountColumns(draft.discount);
      const invoice = await tx.invoice.create({
        data: {
          number: draft.number,
          clientId: draft.clientId,
          quoteId: draft.quoteId,
          status: "draft",
          currency: draft.currency,
          issueDate: draft.issueDate,
          dueDate: draft.dueDate,
          taxName: draft.taxName,
          taxRateBps: draft.taxRateBps,
          notes: draft.notes,
          terms: draft.terms,
          ...columns,
          subtotalMinor: BigInt(draft.totals.subtotalMinor),
          discountTotalMinor: BigInt(draft.totals.discountMinor),
          taxMinor: BigInt(draft.totals.taxMinor),
          totalMinor: BigInt(draft.totals.totalMinor),
          lines: {
            create: draft.lines.map((line) => ({
              position: line.position,
              productId: line.productId,
              description: line.description,
              quantityMilli: line.quantityMilli,
              unitPriceMinor: BigInt(line.unitPriceMinor),
              taxable: line.taxable,
              amountMinor: BigInt(lineAmountMinor(line.quantityMilli, line.unitPriceMinor)),
            })),
          },
        },
      });
      await tx.quote.update({ where: { id }, data: { status: "converted" } });
      return invoice.id;
    });
    refresh(`/quotes/${id}`);
    refresh("/quotes");
    refresh("/invoices");
    refresh("/");
    return { ok: true, href: `/invoices/${invoiceId}` };
  } catch (error) {
    if (error instanceof ConversionError) return { ok: false, message: error.message };
    if (prismaCode(error) === "P2002") {
      return { ok: false, message: "This quote already has an invoice." };
    }
    return persistError(error);
  }
}

export async function createInvoice(input: unknown): Promise<MutationResult> {
  const { db } = await clock();
  const settings = await ensureSettings(db);
  const parsed = parseDocumentInput(input, settings.taxRateBps);
  if (!parsed.ok) return parsed;
  const client = await db.client.findUnique({ where: { id: parsed.value.clientId } });
  if (!client) return { ok: false, message: "Choose a client." };
  try {
    const id = await db.$transaction(async (tx) => {
      const number = await allocateNumber(tx, "invoice", parsed.value.issueDate, settings);
      const row = await tx.invoice.create({
        data: invoiceCreate(number, parsed.value, settings.taxName, settings.taxRateBps, null),
      });
      return row.id;
    });
    refresh("/invoices");
    refresh("/");
    return { ok: true, href: `/invoices/${id}` };
  } catch (error) {
    return persistError(error);
  }
}

export async function updateInvoice(id: string, input: unknown): Promise<MutationResult> {
  const db = await requestDb();
  const existing = await db.invoice.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Invoice not found." };
  if (existing.status !== "draft") return { ok: false, message: "Only a draft invoice can be edited." };
  const parsed = parseDocumentInput(input, existing.taxRateBps);
  if (!parsed.ok) return parsed;
  const client = await db.client.findUnique({ where: { id: parsed.value.clientId } });
  if (!client) return { ok: false, message: "Choose a client." };
  const columns = discountColumns(parsed.value.discount);
  await db.$transaction(async (tx) => {
    await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.update({
      where: { id },
      data: {
        clientId: parsed.value.clientId,
        currency: parsed.value.currency,
        issueDate: parsed.value.issueDate,
        dueDate: parsed.value.endDate,
        notes: parsed.value.notes,
        terms: parsed.value.terms,
        ...columns,
        subtotalMinor: BigInt(parsed.value.totals.subtotalMinor),
        discountTotalMinor: BigInt(parsed.value.totals.discountMinor),
        taxMinor: BigInt(parsed.value.totals.taxMinor),
        totalMinor: BigInt(parsed.value.totals.totalMinor),
        lines: { create: lineCreates(parsed.value) },
      },
    });
  });
  refresh(`/invoices/${id}`);
  refresh("/invoices");
  return { ok: true, href: `/invoices/${id}` };
}

export async function setInvoiceStatus(id: string, next: string): Promise<MutationResult> {
  const { db, today } = await clock();
  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice) return { ok: false, message: "Invoice not found." };
  const current = effectiveInvoiceStatus(asInvoiceStatus(invoice.status), invoice.dueDate, today);
  if (next === "sent" && current === "draft") {
    await db.invoice.update({ where: { id }, data: { status: "sent" } });
  } else if (next === "paid" && (current === "sent" || current === "overdue")) {
    await db.invoice.update({ where: { id }, data: { status: "paid", paidAt: today } });
  } else {
    return { ok: false, message: `A ${current} invoice cannot be marked ${next}.` };
  }
  refresh(`/invoices/${id}`);
  refresh("/invoices");
  refresh("/");
  return { ok: true, href: `/invoices/${id}` };
}

export async function removeInvoice(id: string): Promise<MutationResult> {
  const db = await requestDb();
  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice) return { ok: false, message: "Invoice not found." };
  if (invoice.status !== "draft") return { ok: false, message: "Only a draft invoice can be deleted." };
  await db.$transaction(async (tx) => {
    await tx.invoice.delete({ where: { id } });
    if (invoice.quoteId) {
      await tx.quote.update({ where: { id: invoice.quoteId }, data: { status: "accepted" } });
    }
  });
  refresh("/invoices");
  refresh("/quotes");
  refresh("/");
  return { ok: true, href: "/invoices" };
}

async function clock() {
  const db = await requestDb();
  const today = todayISO(appConfig().timeZone);
  return { db, today };
}

async function ensureSettings(db: PrismaClient): Promise<SettingsRow> {
  const existing = await db.businessSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return db.businessSettings.create({
    data: {
      id: 1,
      legalName: "Your studio",
      tradingName: "Your studio",
      email: "accounts@example.com",
      phone: "",
      address: "",
      defaultCurrency: "NGN",
      taxName: "VAT",
      taxRateBps: NIGERIA_VAT_BPS,
      invoicePrefix: "INV",
      quotePrefix: "QT",
      numberWidth: 4,
      paymentTermsDays: 14,
      footerNote: "",
      paymentProvider: "none",
    },
  });
}

async function allocateNumber(
  tx: Pick<PrismaClient, "invoice" | "quote">,
  kind: "invoice" | "quote",
  issueDate: string,
  settings: SettingsRow,
): Promise<string> {
  const prefix = kind === "invoice" ? settings.invoicePrefix : settings.quotePrefix;
  const year = yearOf(issueDate);
  const rows =
    kind === "invoice"
      ? await tx.invoice.findMany({ select: { number: true } })
      : await tx.quote.findMany({ select: { number: true } });
  const sequence = nextSequence(
    rows.map((row) => row.number),
    prefix,
    year,
  );
  return formatDocumentNumber(prefix, year, sequence, settings.numberWidth);
}

function quoteCreate(number: string, parsed: ParsedDocument, taxName: string, taxRateBps: number) {
  return {
    number,
    clientId: parsed.clientId,
    status: "draft",
    currency: parsed.currency,
    issueDate: parsed.issueDate,
    validUntil: parsed.endDate,
    taxName,
    taxRateBps,
    notes: parsed.notes,
    terms: parsed.terms,
    ...discountColumns(parsed.discount),
    subtotalMinor: BigInt(parsed.totals.subtotalMinor),
    discountTotalMinor: BigInt(parsed.totals.discountMinor),
    taxMinor: BigInt(parsed.totals.taxMinor),
    totalMinor: BigInt(parsed.totals.totalMinor),
    lines: { create: lineCreates(parsed) },
  };
}

function invoiceCreate(
  number: string,
  parsed: ParsedDocument,
  taxName: string,
  taxRateBps: number,
  quoteId: string | null,
) {
  return {
    number,
    clientId: parsed.clientId,
    quoteId,
    status: "draft",
    currency: parsed.currency,
    issueDate: parsed.issueDate,
    dueDate: parsed.endDate,
    taxName,
    taxRateBps,
    notes: parsed.notes,
    terms: parsed.terms,
    ...discountColumns(parsed.discount),
    subtotalMinor: BigInt(parsed.totals.subtotalMinor),
    discountTotalMinor: BigInt(parsed.totals.discountMinor),
    taxMinor: BigInt(parsed.totals.taxMinor),
    totalMinor: BigInt(parsed.totals.totalMinor),
    lines: { create: lineCreates(parsed) },
  };
}

function lineCreates(parsed: ParsedDocument) {
  return parsed.lines.map((line) => ({
    position: line.position,
    productId: line.productId,
    description: line.description,
    quantityMilli: line.quantityMilli,
    unitPriceMinor: BigInt(line.unitPriceMinor),
    taxable: line.taxable,
    amountMinor: BigInt(line.amountMinor),
  }));
}

function discountColumns(discount: Discount) {
  if (discount.kind === "percent") {
    return { discountKind: "percent", discountBps: discount.basisPoints, discountMinor: BigInt(0) };
  }
  if (discount.kind === "amount") {
    return { discountKind: "amount", discountBps: 0, discountMinor: BigInt(discount.minor) };
  }
  return { discountKind: "none", discountBps: 0, discountMinor: BigInt(0) };
}

function quoteSnapshot(row: {
  id: string;
  number: string;
  status: string;
  clientId: string;
  currency: string;
  taxName: string;
  taxRateBps: number;
  discountKind: string;
  discountBps: number;
  discountMinor: bigint;
  notes: string;
  terms: string;
  issueDate: string;
  validUntil: string;
  lines: Array<{
    position: number;
    description: string;
    productId: string | null;
    quantityMilli: number;
    unitPriceMinor: bigint;
    taxable: boolean;
  }>;
}): QuoteSnapshot {
  return {
    id: row.id,
    number: row.number,
    status: asQuoteStatus(row.status),
    clientId: row.clientId,
    currency: row.currency,
    taxName: row.taxName,
    taxRateBps: row.taxRateBps,
    discount: toDiscount(row.discountKind, row.discountBps, row.discountMinor),
    notes: row.notes,
    terms: row.terms,
    issueDate: row.issueDate,
    validUntil: row.validUntil,
    lines: row.lines.map((line) => ({
      position: line.position,
      description: line.description,
      productId: line.productId,
      quantityMilli: line.quantityMilli,
      unitPriceMinor: asMinor(line.unitPriceMinor),
      taxable: line.taxable,
    })),
  };
}

type QuoteRow = NonNullable<Awaited<ReturnType<PrismaClient["quote"]["findUnique"]>>> & {
  client: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    notes: string;
  };
  lines: Array<{
    description: string;
    quantityMilli: number;
    unitPriceMinor: bigint;
    taxable: boolean;
    amountMinor: bigint;
    productId: string | null;
    position: number;
  }>;
  invoice: { id: string; number: string } | null;
};

function quoteDocument(row: QuoteRow, today: string): CommercialDocument {
  const stored = asQuoteStatus(row.status);
  return {
    id: row.id,
    kind: "quote",
    number: row.number,
    storedStatus: stored,
    status: effectiveQuoteStatus(stored, row.validUntil, today),
    currency: row.currency,
    issueDate: row.issueDate,
    endDate: row.validUntil,
    endLabel: "Valid until",
    paidAt: null,
    taxName: row.taxName,
    taxRateBps: row.taxRateBps,
    discount: toDiscount(row.discountKind, row.discountBps, row.discountMinor),
    notes: row.notes,
    terms: row.terms,
    lines: linesOf(row.lines),
    totals: computeTotals(
      row.lines.map((line) => ({
        quantityMilli: line.quantityMilli,
        unitPriceMinor: asMinor(line.unitPriceMinor),
        taxable: line.taxable,
      })),
      toDiscount(row.discountKind, row.discountBps, row.discountMinor),
      row.taxRateBps,
    ),
    client: toParty(row.client),
    related: row.invoice
      ? { href: `/invoices/${row.invoice.id}`, label: `Invoice ${row.invoice.number}` }
      : null,
  };
}

type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  taxName: string;
  taxRateBps: number;
  discountKind: string;
  discountBps: number;
  discountMinor: bigint;
  notes: string;
  terms: string;
  subtotalMinor: bigint;
  discountTotalMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
  client: QuoteRow["client"];
  lines: QuoteRow["lines"];
  quote: { id: string; number: string } | null;
};

function invoiceDocument(row: InvoiceRow, today: string): CommercialDocument {
  const stored = asInvoiceStatus(row.status);
  return {
    id: row.id,
    kind: "invoice",
    number: row.number,
    storedStatus: stored,
    status: effectiveInvoiceStatus(stored, row.dueDate, today),
    currency: row.currency,
    issueDate: row.issueDate,
    endDate: row.dueDate,
    endLabel: "Due",
    paidAt: row.paidAt,
    taxName: row.taxName,
    taxRateBps: row.taxRateBps,
    discount: toDiscount(row.discountKind, row.discountBps, row.discountMinor),
    notes: row.notes,
    terms: row.terms,
    lines: linesOf(row.lines),
    totals: computeTotals(
      row.lines.map((line) => ({
        quantityMilli: line.quantityMilli,
        unitPriceMinor: asMinor(line.unitPriceMinor),
        taxable: line.taxable,
      })),
      toDiscount(row.discountKind, row.discountBps, row.discountMinor),
      row.taxRateBps,
    ),
    client: toParty(row.client),
    related: row.quote ? { href: `/quotes/${row.quote.id}`, label: `Quote ${row.quote.number}` } : null,
  };
}

function linesOf(lines: QuoteRow["lines"]): DocumentLineView[] {
  return [...lines]
    .sort((a, b) => a.position - b.position)
    .map((line) => ({
      description: line.description,
      quantityMilli: line.quantityMilli,
      unitPriceMinor: asMinor(line.unitPriceMinor),
      taxable: line.taxable,
      amountMinor: asMinor(line.amountMinor),
      productId: line.productId,
    }));
}

function toDiscount(kind: string, basisPoints: number, amount: bigint): Discount {
  if (kind === "percent") return { kind: "percent", basisPoints };
  if (kind === "amount") return { kind: "amount", minor: asMinor(amount) };
  return { kind: "none" };
}

function toParty(row: QuoteRow["client"]): Party {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    country: row.country,
    notes: row.notes,
  };
}

function toProfile(row: SettingsRow): BusinessProfile {
  return { ...row };
}

function asMinor(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error("Amount exceeds a safe integer");
  return number;
}

function asInvoiceStatus(value: string): InvoiceStatus {
  if (value === "draft" || value === "sent" || value === "paid" || value === "overdue") return value;
  return "draft";
}

function asQuoteStatus(value: string): StoredQuoteStatus {
  if (
    value === "draft" ||
    value === "sent" ||
    value === "accepted" ||
    value === "declined" ||
    value === "converted"
  ) {
    return value;
  }
  return "draft";
}

function refresh(path: string) {
  revalidatePath(path);
}

function prismaCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return null;
}

function persistError(error: unknown): MutationResult {
  if (error instanceof NumberingError) return { ok: false, message: error.message };
  if (prismaCode(error) === "P2002") return { ok: false, message: "That number is already in use." };
  throw error;
}
