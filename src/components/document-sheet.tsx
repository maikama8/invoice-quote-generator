import Link from "next/link";
import { formatDisplayDate, formatRate } from "@/lib/format";
import { formatQuantity } from "@/lib/money";
import { clientContact, clientTitle, type BusinessProfile, type CommercialDocument } from "@/lib/views";
import { Money } from "./money";
import { StatusPill } from "./status-pill";

export function DocumentSheet({
  business,
  document,
}: {
  business: BusinessProfile;
  document: CommercialDocument;
}) {
  const discountLabel =
    document.discount.kind === "percent"
      ? `Discount (${formatRate(document.discount.basisPoints)})`
      : "Discount";
  const stamp =
    document.status === "paid" ? "Paid" : document.status === "overdue" ? "Overdue" : null;

  return (
    <article className="sheet relative">
      {stamp ? (
        <p
          className={`absolute top-8 right-8 hidden rotate-[-8deg] border-2 px-3 py-1 text-sm font-semibold tracking-[0.18em] uppercase sm:block ${
            document.status === "paid" ? "border-paid text-paid" : "border-stamp text-stamp"
          }`}
        >
          {stamp}
        </p>
      ) : null}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink pb-6">
        <div>
          {business.logoDataUrl ? (
            // User-uploaded logo is a data URL. next/image does not serve those.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoDataUrl} alt="" className="mb-3 h-12 w-auto object-contain" />
          ) : null}
          <p className="font-serif text-3xl tracking-tight">{business.tradingName}</p>
          <p className="mt-1 text-sm text-ink-soft">{business.legalName}</p>
          <address className="mt-3 text-sm leading-6 text-ink-soft not-italic whitespace-pre-line">
            {business.address}
          </address>
          <p className="mt-2 text-sm text-ink-soft">
            {[business.email, business.phone].filter(Boolean).join(" · ")}
          </p>
          {business.tin ? <p className="text-sm text-ink-soft">TIN {business.tin}</p> : null}
        </div>
        <div className="text-left sm:text-right">
          <p className="eyebrow">{document.kind}</p>
          <p className="mt-1 font-serif text-3xl">{document.number}</p>
          <div className="mt-3 sm:flex sm:justify-end">
            <StatusPill status={document.status} />
          </div>
        </div>
      </header>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="eyebrow">Bill to</p>
          <p className="mt-2 font-medium">{clientTitle(document.client)}</p>
          {clientContact(document.client) ? (
            <p className="text-sm text-ink-soft">{clientContact(document.client)}</p>
          ) : null}
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {document.client.address}
            {document.client.city ? `, ${document.client.city}` : ""}
            {document.client.country ? `, ${document.client.country}` : ""}
          </p>
          {document.client.email ? <p className="text-sm text-ink-soft">{document.client.email}</p> : null}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:justify-items-end">
          <div>
            <dt className="eyebrow">Issued</dt>
            <dd className="mt-1">{formatDisplayDate(document.issueDate)}</dd>
          </div>
          <div>
            <dt className="eyebrow">{document.endLabel}</dt>
            <dd className="mt-1">{formatDisplayDate(document.endDate)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Currency</dt>
            <dd className="mt-1">{document.currency}</dd>
          </div>
          {document.paidAt ? (
            <div>
              <dt className="eyebrow">Paid</dt>
              <dd className="mt-1">{formatDisplayDate(document.paidAt)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="mt-8 overflow-x-auto">
        <table className="data-table min-w-[36rem]">
          <thead>
            <tr>
              <th>Description</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {document.lines.map((line, index) => (
              <tr key={`${line.description}-${index}`}>
                <td>
                  {line.description}
                  {line.taxable ? null : <span className="ml-2 text-ink-soft">Exempt</span>}
                </td>
                <td className="text-right tabular-nums">{formatQuantity(line.quantityMilli)}</td>
                <td className="text-right">
                  <Money minor={line.unitPriceMinor} currency={document.currency} />
                </td>
                <td className="text-right">
                  <Money minor={line.amountMinor} currency={document.currency} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-6 ml-auto grid max-w-xs gap-2 text-sm">
        <div className="flex justify-between gap-8">
          <dt>Subtotal</dt>
          <dd>
            <Money minor={document.totals.subtotalMinor} currency={document.currency} />
          </dd>
        </div>
        {document.totals.discountMinor > 0 ? (
          <div className="flex justify-between gap-8">
            <dt>{discountLabel}</dt>
            <dd>
              −<Money minor={document.totals.discountMinor} currency={document.currency} />
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-8">
          <dt>
            {document.taxName} ({formatRate(document.taxRateBps)})
          </dt>
          <dd>
            <Money minor={document.totals.taxMinor} currency={document.currency} />
          </dd>
        </div>
        <div className="flex justify-between gap-8 border-t border-ink pt-2 font-serif text-xl">
          <dt>Total</dt>
          <dd>
            <Money minor={document.totals.totalMinor} currency={document.currency} />
          </dd>
        </div>
      </dl>
      {document.notes ? (
        <section className="mt-8 max-w-xl">
          <h2 className="eyebrow">Notes</h2>
          <p className="mt-2 text-sm leading-6 whitespace-pre-line">{document.notes}</p>
        </section>
      ) : null}
      {document.terms ? (
        <section className="mt-6 max-w-xl">
          <h2 className="eyebrow">Terms</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft whitespace-pre-line">{document.terms}</p>
        </section>
      ) : null}
      {business.bankAccountNumber ? (
        <section className="mt-6 max-w-xl">
          <h2 className="eyebrow">Transfer</h2>
          <p className="mt-2 text-sm leading-6">
            {business.bankName}
            {business.bankAccountName ? ` · ${business.bankAccountName}` : ""} · {business.bankAccountNumber}
          </p>
        </section>
      ) : null}
      {document.related ? (
        <p className="mt-8 text-sm">
          <Link href={document.related.href} className="underline decoration-gold underline-offset-4">
            {document.related.label}
          </Link>
        </p>
      ) : null}
      {business.footerNote ? (
        <p className="mt-8 border-t border-rule pt-4 text-xs leading-5 text-ink-soft">{business.footerNote}</p>
      ) : null}
    </article>
  );
}
