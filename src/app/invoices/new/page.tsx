import Link from "next/link";
import { Suspense } from "react";
import { DocumentForm } from "@/components/document-form";
import { PageHeader } from "@/components/page-header";
import { appConfig } from "@/lib/config";
import { addISODays, todayISO } from "@/lib/dates";
import { emptyDocumentValues } from "@/lib/document-input";
import { createInvoiceAction } from "@/server/actions";
import { getBusiness, getCatalogue, getClients } from "@/server/books";

export const metadata = { title: "New invoice" };

const TERMS = "Payment is due on the date shown. Quote the document number on the transfer.";

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Preparing an invoice…</p>}>
      <NewInvoice />
    </Suspense>
  );
}

async function NewInvoice() {
  const [settings, clients, products] = await Promise.all([getBusiness(), getClients(), getCatalogue()]);
  const today = todayISO(appConfig().timeZone);
  if (clients.length === 0) {
    return (
      <>
        <PageHeader title="New invoice" lede="Add a client before writing an invoice." />
        <Link href="/clients/new" className="btn-primary">
          Add a client
        </Link>
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Invoice"
        title="New invoice"
        lede="The number is taken from the issue date’s year, after the last invoice with the same prefix."
      />
      <DocumentForm
        kind="invoice"
        clients={clients.map((client) => ({ id: client.id, name: client.name, company: client.company }))}
        products={products.filter((product) => product.active)}
        taxName={settings.taxName}
        taxRateBps={settings.taxRateBps}
        initial={emptyDocumentValues({
          currency: settings.defaultCurrency,
          issueDate: today,
          endDate: addISODays(today, settings.paymentTermsDays),
          terms: TERMS,
        })}
        action={createInvoiceAction}
        submitLabel="Save draft"
      />
    </>
  );
}
