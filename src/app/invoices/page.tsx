import Link from "next/link";
import { Suspense } from "react";
import { DocumentTable, FilterBar } from "@/components/document-table";
import { PageHeader } from "@/components/page-header";
import { listInvoices } from "@/server/books";

export const metadata = { title: "Invoices" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "paid", label: "Paid" },
  { id: "overdue", label: "Overdue" },
];

export default function InvoicesPage(props: { searchParams: Promise<{ status?: string | string[] }> }) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading invoices…</p>}>
      <Invoices searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Invoices({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status || "all";
  const rows = await listInvoices(status);
  return (
    <>
      <PageHeader
        eyebrow="Receivables"
        title="Invoices"
        lede="A sent invoice becomes overdue the day after it is due. Paid invoices stay paid."
      >
        <Link href="/invoices/new" className="btn-primary">
          New invoice
        </Link>
      </PageHeader>
      <FilterBar base="/invoices" current={status} filters={FILTERS} />
      <DocumentTable rows={rows} hrefBase="/invoices" endLabel="Due" empty="No invoices in this view." />
    </>
  );
}
