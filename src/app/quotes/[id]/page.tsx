import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocumentForm } from "@/components/document-form";
import { DocumentMenu } from "@/components/document-menu";
import { DocumentSheet } from "@/components/document-sheet";
import { PageHeader } from "@/components/page-header";
import { editorValuesFrom } from "@/lib/document-input";
import { clientTitle } from "@/lib/views";
import { updateQuoteAction } from "@/server/actions";
import { getBusiness, getCatalogue, getClients, getQuote } from "@/server/books";

export default function QuotePage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Opening the quote…</p>}>
      <QuoteDetail params={props.params} />
    </Suspense>
  );
}

async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();
  const business = await getBusiness();
  return (
    <>
      <PageHeader eyebrow="Quote" title={quote.number} lede={clientTitle(quote.client)}>
        <DocumentMenu document={quote} />
      </PageHeader>
      {quote.storedStatus === "draft" ? <QuoteEditor id={quote.id} /> : <DocumentSheet business={business} document={quote} />}
    </>
  );
}

async function QuoteEditor({ id }: { id: string }) {
  const [quote, clients, products] = await Promise.all([getQuote(id), getClients(), getCatalogue()]);
  if (!quote) notFound();
  return (
    <DocumentForm
      kind="quote"
      clients={clients.map((client) => ({ id: client.id, name: client.name, company: client.company }))}
      products={products.filter((product) => product.active)}
      taxName={quote.taxName}
      taxRateBps={quote.taxRateBps}
      initial={editorValuesFrom({
        clientId: quote.client.id,
        currency: quote.currency,
        issueDate: quote.issueDate,
        endDate: quote.endDate,
        discount: quote.discount,
        notes: quote.notes,
        terms: quote.terms,
        lines: quote.lines,
      })}
      action={updateQuoteAction.bind(null, quote.id)}
      submitLabel="Save draft"
    />
  );
}
