import Link from "next/link";
import { Suspense } from "react";
import { FilterBar, DocumentTable } from "@/components/document-table";
import { PageHeader } from "@/components/page-header";
import { listQuotes } from "@/server/books";

export const metadata = { title: "Quotes" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" },
  { id: "expired", label: "Expired" },
  { id: "converted", label: "Converted" },
];

export default function QuotesPage(props: { searchParams: Promise<{ status?: string | string[] }> }) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading quotes…</p>}>
      <Quotes searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Quotes({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status || "all";
  const rows = await listQuotes(status);
  return (
    <>
      <PageHeader
        eyebrow="Pipeline"
        title="Quotes"
        lede="A sent quote expires the day after its valid-until date. Accepted quotes can still be converted."
      >
        <Link href="/quotes/new" className="btn-primary">
          New quote
        </Link>
      </PageHeader>
      <FilterBar base="/quotes" current={status} filters={FILTERS} />
      <DocumentTable rows={rows} hrefBase="/quotes" endLabel="Valid until" empty="No quotes in this view." />
    </>
  );
}
