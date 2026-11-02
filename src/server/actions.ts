"use server";

import { redirect } from "next/navigation";
import {
  convertQuote,
  createInvoice,
  createQuote,
  removeClient,
  removeInvoice,
  removeProduct,
  removeQuote,
  saveClient,
  saveProduct,
  saveSettings,
  setInvoiceStatus,
  setQuoteStatus,
  updateInvoice,
  updateQuote,
} from "./books";
import type { ActionState, MutationResult } from "@/lib/result";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function go(result: MutationResult): Promise<ActionState> {
  if (!result.ok) return result;
  redirect(result.href);
}

async function finish(result: MutationResult): Promise<void> {
  if (!result.ok) throw new Error(result.message);
  redirect(result.href);
}

export async function createQuoteAction(input: unknown): Promise<MutationResult> {
  return createQuote(input);
}

export async function updateQuoteAction(id: string, input: unknown): Promise<MutationResult> {
  return updateQuote(id, input);
}

export async function createInvoiceAction(input: unknown): Promise<MutationResult> {
  return createInvoice(input);
}

export async function updateInvoiceAction(id: string, input: unknown): Promise<MutationResult> {
  return updateInvoice(id, input);
}

export async function quoteStatusAction(id: string, status: string): Promise<void> {
  await finish(await setQuoteStatus(id, status));
}

export async function invoiceStatusAction(id: string, status: string): Promise<void> {
  await finish(await setInvoiceStatus(id, status));
}

export async function convertQuoteAction(id: string): Promise<void> {
  await finish(await convertQuote(id));
}

export async function deleteQuoteAction(id: string): Promise<void> {
  await finish(await removeQuote(id));
}

export async function deleteInvoiceAction(id: string): Promise<void> {
  await finish(await removeInvoice(id));
}

export async function clientAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id").trim();
  return go(
    await saveClient(id || null, {
      name: text(formData, "name"),
      company: text(formData, "company"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      address: text(formData, "address"),
      city: text(formData, "city"),
      country: text(formData, "country"),
      notes: text(formData, "notes"),
    }),
  );
}

export async function deleteClientAction(id: string): Promise<void> {
  await finish(await removeClient(id));
}

export async function productAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id").trim();
  return go(
    await saveProduct(id || null, {
      sku: text(formData, "sku"),
      name: text(formData, "name"),
      description: text(formData, "description"),
      unitPrice: text(formData, "unitPrice"),
      currency: text(formData, "currency"),
      unit: text(formData, "unit"),
      taxable: formData.get("taxable") === "on",
      active: formData.get("active") === "on",
    }),
  );
}

export async function deleteProductAction(id: string): Promise<void> {
  await finish(await removeProduct(id));
}

export async function settingsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let logoDataUrl: string | undefined;
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      return { ok: false, message: "Logo must be a PNG or JPEG." };
    }
    if (file.size > 400_000) {
      return { ok: false, message: "Logo must be 400 KB or smaller." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    logoDataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
  }
  return go(
    await saveSettings({
      legalName: text(formData, "legalName"),
      tradingName: text(formData, "tradingName"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      address: text(formData, "address"),
      website: text(formData, "website"),
      tin: text(formData, "tin"),
      defaultCurrency: text(formData, "defaultCurrency"),
      taxName: text(formData, "taxName"),
      taxRate: text(formData, "taxRate"),
      invoicePrefix: text(formData, "invoicePrefix"),
      quotePrefix: text(formData, "quotePrefix"),
      numberWidth: text(formData, "numberWidth"),
      paymentTermsDays: text(formData, "paymentTermsDays"),
      footerNote: text(formData, "footerNote"),
      bankName: text(formData, "bankName"),
      bankAccountName: text(formData, "bankAccountName"),
      bankAccountNumber: text(formData, "bankAccountNumber"),
      paymentProvider: text(formData, "paymentProvider"),
      logoDataUrl,
      removeLogo: formData.get("removeLogo") === "on",
    }),
  );
}

