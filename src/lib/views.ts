import type { Discount, DocumentTotals } from "./money";

export type Party = {
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

export type BusinessProfile = {
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

export type DocumentLineView = {
  description: string;
  quantityMilli: number;
  unitPriceMinor: number;
  taxable: boolean;
  amountMinor: number;
  productId: string | null;
};

export type CommercialDocument = {
  id: string;
  kind: "quote" | "invoice";
  number: string;
  status: string;
  storedStatus: string;
  currency: string;
  issueDate: string;
  endDate: string;
  endLabel: string;
  paidAt: string | null;
  taxName: string;
  taxRateBps: number;
  discount: Discount;
  notes: string;
  terms: string;
  lines: DocumentLineView[];
  totals: DocumentTotals;
  client: Party;
  related: { href: string; label: string } | null;
};

export type DocumentRow = {
  id: string;
  number: string;
  clientName: string;
  status: string;
  issueDate: string;
  endDate: string;
  currency: string;
  totalMinor: number;
};

export type CatalogueItem = {
  id: string;
  sku: string;
  name: string;
  description: string;
  unitPriceMinor: number;
  currency: string;
  unit: string;
  taxable: boolean;
  active: boolean;
};

export function clientTitle(client: { name: string; company: string }): string {
  return client.company.trim() || client.name.trim() || "Client";
}

export function clientContact(client: { name: string; company: string }): string {
  if (client.company.trim() && client.name.trim() && client.company.trim() !== client.name.trim()) {
    return client.name.trim();
  }
  return "";
}
