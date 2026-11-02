import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocumentForm } from "@/components/document-form";
import { DocumentMenu } from "@/components/document-menu";
import { DocumentSheet } from "@/components/document-sheet";
import { PageHeader } from "@/components/page-header";
import { editorValuesFrom } from "@/lib/document-input";
import type { PaymentLink } from "@/lib/payments/types";
import { clientTitle } from "@/lib/views";
import { updateInvoiceAction } from "@/server/actions";
import { getBusiness, getCatalogue, getClients, getInvoice, paymentLinkFor } from "@/server/books";

export default function InvoicePage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Opening the invoice…</p>}>
      <InvoiceDetail params={props.params} />
    </Suspense>
  );
}

async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const [business, payment] = await Promise.all([getBusiness(), paymentLinkFor(invoice)]);
  return (
    <>
      <PageHeader eyebrow="Invoice" title={invoice.number} lede={clientTitle(invoice.client)}>
        <DocumentMenu document={invoice} />
      </PageHeader>
      {invoice.storedStatus === "draft" ? (
        <InvoiceEditor id={invoice.id} />
      ) : (
        <div className="grid items-start gap-6">
          <DocumentSheet business={business} document={invoice} />
          <PaymentPanel payment={payment} />
        </div>
      )}
    </>
  );
}

function PaymentPanel({ payment }: { payment: PaymentLink }) {
  return (
    <section className="card p-5">
      <h2 className="eyebrow">Payment link</h2>
      {payment.enabled ? (
        <>
          <p className="mt-2 text-sm text-stamp">{payment.disclaimer}</p>
          <a href={payment.url} className="mt-2 block text-sm break-all underline decoration-gold underline-offset-4">
            {payment.url}
          </a>
        </>
      ) : (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">{payment.reason}</p>
      )}
    </section>
  );
}

async function InvoiceEditor({ id }: { id: string }) {
  const [invoice, clients, products] = await Promise.all([getInvoice(id), getClients(), getCatalogue()]);
  if (!invoice) notFound();
  return (
    <DocumentForm
      kind="invoice"
      clients={clients.map((client) => ({ id: client.id, name: client.name, company: client.company }))}
      products={products.filter((product) => product.active)}
      taxName={invoice.taxName}
      taxRateBps={invoice.taxRateBps}
      initial={editorValuesFrom({
        clientId: invoice.client.id,
        currency: invoice.currency,
        issueDate: invoice.issueDate,
        endDate: invoice.endDate,
        discount: invoice.discount,
        notes: invoice.notes,
        terms: invoice.terms,
        lines: invoice.lines,
      })}
      action={updateInvoiceAction.bind(null, invoice.id)}
      submitLabel="Save draft"
    />
  );
}
