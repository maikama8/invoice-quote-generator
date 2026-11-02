"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { CURRENCIES } from "@/lib/currencies";
import {
  parseDocumentInput,
  type DocumentFormValues,
  type LineDraft,
} from "@/lib/document-input";
import { formatMinor, formatRate } from "@/lib/format";
import type { MutationResult } from "@/lib/result";

type LineState = LineDraft & { key: string };

type ProductOption = {
  id: string;
  name: string;
  unitPriceMinor: number;
  currency: string;
  unit: string;
  taxable: boolean;
};

type ClientOption = {
  id: string;
  name: string;
  company: string;
};

export function DocumentForm({
  kind,
  clients,
  products,
  taxName,
  taxRateBps,
  initial,
  action,
  submitLabel,
}: {
  kind: "quote" | "invoice";
  clients: ClientOption[];
  products: ProductOption[];
  taxName: string;
  taxRateBps: number;
  initial: DocumentFormValues;
  action: (input: DocumentFormValues) => Promise<MutationResult>;
  submitLabel: string;
}) {
  const router = useRouter();
  const keyRef = useRef(initial.lines.length);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(initial.clientId);
  const [currency, setCurrency] = useState(initial.currency);
  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [discountKind, setDiscountKind] = useState(initial.discountKind);
  const [discountValue, setDiscountValue] = useState(initial.discountValue);
  const [notes, setNotes] = useState(initial.notes);
  const [terms, setTerms] = useState(initial.terms);
  const [lines, setLines] = useState<LineState[]>(
    initial.lines.map((line, index) => ({ ...line, key: `line-${index}` })),
  );
  const [catalogueId, setCatalogueId] = useState("");

  const values: DocumentFormValues = {
    clientId,
    currency,
    issueDate,
    endDate,
    discountKind,
    discountValue,
    notes,
    terms,
    lines,
  };
  const preview = parseDocumentInput(values, taxRateBps);
  const endLabel = kind === "quote" ? "Valid until" : "Due";
  const catalogue = products.filter((product) => product.currency === currency);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function addProduct() {
    const product = products.find((item) => item.id === catalogueId);
    if (!product) return;
    if (product.currency !== currency) {
      setError(`${product.name} is priced in ${product.currency}. This document is ${currency}.`);
      return;
    }
    const key = `new-${keyRef.current}`;
    keyRef.current += 1;
    const unit = product.unit && product.unit !== "item" ? ` · ${product.unit}` : "";
    setLines((current) => [
      ...current,
      {
        key,
        description: `${product.name}${unit}`,
        quantity: "1",
        unitPrice: (product.unitPriceMinor / 100).toFixed(2),
        taxable: product.taxable,
        productId: product.id,
      },
    ]);
    setCatalogueId("");
    setError(null);
  }

  function addBlank() {
    const key = `new-${keyRef.current}`;
    keyRef.current += 1;
    setLines((current) => [
      ...current,
      { key, description: "", quantity: "1", unitPrice: "", taxable: true, productId: null },
    ]);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await action(values);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(result.href);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="card grid gap-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span>Client</span>
            <select value={clientId} onChange={(event) => setClientId(event.target.value)} required>
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company || client.name}
                  {client.company && client.name ? ` · ${client.name}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Currency</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Issue date</span>
            <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
          </label>
          <label className="field">
            <span>{endLabel}</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
          </label>
          <div className="field">
            <span>From the catalogue</span>
            <div className="flex gap-2">
              <select
                value={catalogueId}
                onChange={(event) => setCatalogueId(event.target.value)}
                aria-label="Catalogue item"
              >
                <option value="">
                  {catalogue.length === 0 ? `No ${currency} items` : "Choose an item"}
                </option>
                {catalogue.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {formatMinor(product.unitPriceMinor, product.currency)}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-secondary shrink-0" onClick={addProduct}>
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {lines.map((line, index) => (
            <div key={line.key} className="grid gap-3 rounded-lg border border-rule bg-white p-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_auto]">
              <label className="field sm:col-span-1">
                <span>Line {index + 1}</span>
                <input
                  value={line.description}
                  onChange={(event) => updateLine(line.key, { description: event.target.value })}
                  placeholder="Description"
                />
              </label>
              <label className="field">
                <span>Qty</span>
                <input
                  value={line.quantity}
                  inputMode="decimal"
                  onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Price</span>
                <input
                  value={line.unitPrice}
                  inputMode="decimal"
                  onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
                />
              </label>
              <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-start">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={line.taxable}
                    onChange={(event) => updateLine(line.key, { taxable: event.target.checked })}
                  />
                  {taxName}
                </label>
                <button
                  type="button"
                  className="text-sm text-stamp"
                  onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary w-fit" onClick={addBlank}>
            Add a blank line
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Discount</span>
            <select
              value={discountKind}
              onChange={(event) => {
                setDiscountKind(event.target.value as DocumentFormValues["discountKind"]);
                setDiscountValue("");
              }}
            >
              <option value="none">None</option>
              <option value="percent">Percent</option>
              <option value="amount">Fixed amount</option>
            </select>
          </label>
          {discountKind === "none" ? (
            <p className="self-end text-sm text-ink-soft">No discount on this {kind}.</p>
          ) : (
            <label className="field">
              <span>{discountKind === "percent" ? "Percent" : `Amount (${currency})`}</span>
              <input
                value={discountValue}
                inputMode="decimal"
                onChange={(event) => setDiscountValue(event.target.value)}
                placeholder={discountKind === "percent" ? "5" : "0.00"}
              />
            </label>
          )}
          <label className="field sm:col-span-2">
            <span>Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label className="field sm:col-span-2">
            <span>Terms</span>
            <textarea value={terms} onChange={(event) => setTerms(event.target.value)} />
          </label>
        </div>
      </div>

      <aside className="card sticky top-6 grid gap-3 p-5">
        <p className="eyebrow">Totals</p>
        <p className="text-sm text-ink-soft">
          {taxName} at {formatRate(taxRateBps)} is applied to the taxable amount after the discount. Prices are not converted between currencies.
        </p>
        {preview.ok ? (
          <dl className="grid gap-2 text-sm">
            <Row label="Subtotal" value={formatMinor(preview.value.totals.subtotalMinor, currency)} />
            <Row label="Discount" value={formatMinor(preview.value.totals.discountMinor, currency)} />
            <Row label={taxName} value={formatMinor(preview.value.totals.taxMinor, currency)} />
            <div className="flex justify-between border-t border-ink pt-2 font-serif text-2xl">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMinor(preview.value.totals.totalMinor, currency)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-ink-soft">{preview.message}</p>
        )}
        {error ? (
          <p className="text-sm text-stamp" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </aside>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
