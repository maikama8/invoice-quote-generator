import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { clientTitle } from "@/lib/views";
import { getClients } from "@/server/books";

export const metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading clients…</p>}>
      <Clients />
    </Suspense>
  );
}

async function Clients() {
  const clients = await getClients();
  return (
    <>
      <PageHeader eyebrow="Address book" title="Clients" lede="A client with quotes or invoices cannot be deleted.">
        <Link href="/clients/new" className="btn-primary">
          New client
        </Link>
      </PageHeader>
      {clients.length === 0 ? (
        <p className="card px-5 py-8 text-sm text-ink-soft">No clients yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[40rem]">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>City</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link href={`/clients/${client.id}`} className="font-medium underline decoration-gold underline-offset-4">
                      {clientTitle(client)}
                    </Link>
                    {client.company && client.name !== client.company ? (
                      <p className="text-ink-soft">{client.name}</p>
                    ) : null}
                  </td>
                  <td>{client.email}</td>
                  <td>{client.city}</td>
                  <td>{client.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
