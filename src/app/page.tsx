import Link from "next/link";
import { Suspense } from "react";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { DocumentTable } from "@/components/document-table";
import { getDashboard } from "@/server/books";

export const metadata = { title: "Overview" };

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Adding up the books…</p>}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const dashboard = await getDashboard();
  const primary =
    dashboard.buckets.find((bucket) => bucket.currency === dashboard.settings.defaultCurrency) ??
    dashboard.buckets[0];
  return (
    <>
      <PageHeader
        eyebrow={dashboard.settings.tradingName}
        title="Overview"
        lede="Outstanding is unpaid work, including anything overdue. Drafts stay off both totals. Currencies are never added together."
      >
        <Link href="/quotes/new" className="btn-secondary">
          New quote
        </Link>
        <Link href="/invoices/new" className="btn-primary">
          New invoice
        </Link>
      </PageHeader>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <p className="eyebrow">Outstanding · {primary.currency}</p>
          <p className="mt-3 font-serif text-3xl">
            <Money minor={primary.outstandingMinor} currency={primary.currency} />
          </p>
          <p className="mt-2 text-sm text-ink-soft">{primary.outstandingCount} unpaid</p>
        </article>
        <article className="card border-stamp/30 p-5">
          <p className="eyebrow">Overdue · {primary.currency}</p>
          <p className="mt-3 font-serif text-3xl text-stamp">
            <Money minor={primary.overdueMinor} currency={primary.currency} />
          </p>
          <p className="mt-2 text-sm text-ink-soft">Included in outstanding</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Paid · {primary.currency}</p>
          <p className="mt-3 font-serif text-3xl text-paid">
            <Money minor={primary.paidMinor} currency={primary.currency} />
          </p>
          <p className="mt-2 text-sm text-ink-soft">{primary.paidCount} settled</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Open quotes</p>
          <p className="mt-3 font-serif text-3xl tabular-nums">{dashboard.quoteSummary.open}</p>
          <p className="mt-2 text-sm text-ink-soft">
            {dashboard.quoteSummary.accepted} accepted · {dashboard.quoteSummary.expired} expired
          </p>
        </article>
      </section>
      {dashboard.buckets.length > 1 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-2xl">By currency</h2>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[36rem]">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th className="text-right">Outstanding</th>
                  <th className="text-right">Overdue</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Drafts</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.buckets.map((bucket) => (
                  <tr key={bucket.currency}>
                    <td>{bucket.currency}</td>
                    <td className="text-right">
                      <Money minor={bucket.outstandingMinor} currency={bucket.currency} />
                    </td>
                    <td className="text-right">
                      <Money minor={bucket.overdueMinor} currency={bucket.currency} />
                    </td>
                    <td className="text-right">
                      <Money minor={bucket.paidMinor} currency={bucket.currency} />
                    </td>
                    <td className="text-right">
                      <Money minor={bucket.draftMinor} currency={bucket.currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {dashboard.attention.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 font-serif text-2xl">Needs attention</h2>
          <DocumentTable
            rows={dashboard.attention}
            hrefBase="/invoices"
            endLabel="Due"
            empty="Nothing is overdue."
          />
        </section>
      ) : null}
      <section className="mt-10 grid gap-10">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">Recent invoices</h2>
            <Link href="/invoices" className="text-sm underline decoration-gold underline-offset-4">
              All invoices
            </Link>
          </div>
          <DocumentTable rows={dashboard.recentInvoices} hrefBase="/invoices" endLabel="Due" empty="No invoices yet." />
        </div>
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">Recent quotes</h2>
            <Link href="/quotes" className="text-sm underline decoration-gold underline-offset-4">
              All quotes
            </Link>
          </div>
          <DocumentTable rows={dashboard.recentQuotes} hrefBase="/quotes" endLabel="Valid until" empty="No quotes yet." />
        </div>
      </section>
    </>
  );
}
