import Link from "next/link";
import { formatDisplayDate } from "@/lib/format";
import type { DocumentRow } from "@/lib/views";
import { Money } from "./money";
import { StatusPill } from "./status-pill";

export function DocumentTable({
  rows,
  hrefBase,
  endLabel,
  empty,
}: {
  rows: DocumentRow[];
  hrefBase: "/quotes" | "/invoices";
  endLabel: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="card px-5 py-8 text-sm text-ink-soft">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[42rem]">
        <thead>
          <tr>
            <th>Number</th>
            <th>Client</th>
            <th>Status</th>
            <th>Issued</th>
            <th>{endLabel}</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link href={`${hrefBase}/${row.id}`} className="font-medium underline decoration-gold underline-offset-4">
                  {row.number}
                </Link>
              </td>
              <td>{row.clientName}</td>
              <td>
                <StatusPill status={row.status} />
              </td>
              <td>{formatDisplayDate(row.issueDate)}</td>
              <td>{formatDisplayDate(row.endDate)}</td>
              <td className="text-right">
                <Money minor={row.totalMinor} currency={row.currency} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilterBar({
  base,
  current,
  filters,
}: {
  base: string;
  current: string;
  filters: { id: string; label: string }[];
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {filters.map((filter) => {
        const on = current === filter.id;
        const href = filter.id === "all" ? base : `${base}?status=${filter.id}`;
        return (
          <Link
            key={filter.id}
            href={href}
            className={`rounded-full px-3 py-1 text-sm ${on ? "bg-ink text-paper" : "bg-card text-ink-soft ring-1 ring-rule"}`}
            aria-current={on ? "page" : undefined}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
