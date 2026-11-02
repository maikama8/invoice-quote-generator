import Link from "next/link";
import { Suspense } from "react";
import { DocumentForm } from "@/components/document-form";
import { PageHeader } from "@/components/page-header";
import { appConfig } from "@/lib/config";
import { todayISO, addISODays } from "@/lib/dates";
import { emptyDocumentValues } from "@/lib/document-input";
import { createQuoteAction } from "@/server/actions";
import { getBusiness, getCatalogue, getClients } from "@/server/books";

export const metadata = { title: "New quote" };

const TERMS = "Payment is due on the date shown. Quote the document number on the transfer.";

export default function NewQuotePage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Preparing a quote…</p>}>
      <NewQuote />
    </Suspense>
  );
}

async function NewQuote() {
  const [settings, clients, products] = await Promise.all([getBusiness(), getClients(), getCatalogue()]);
  const today = todayISO(appConfig().timeZone);
  if (clients.length === 0) {
    return (
      <>
        <PageHeader title="New quote" lede="Add a client before writing a quote." />
        <Link href="/clients/new" className="btn-primary">
          Add a client
        </Link>
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Quote"
        title="New quote"
        lede={`${settings.taxName} is snapshotted at ${settings.taxRateBps / 100}% from settings. Later rate changes do not rewrite this quote.`}
      />
      <DocumentForm
        kind="quote"
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
        action={createQuoteAction}
        submitLabel="Save draft"
      />
    </>
  );
}
