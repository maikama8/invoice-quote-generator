import { renderCommercialPdf } from "@/lib/pdf/document-pdf";
import { getBusiness, getInvoice, paymentLinkFor } from "@/server/books";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const document = await getInvoice(id);
  if (!document) return new Response("Invoice not found", { status: 404 });
  const business = await getBusiness();
  const payment = await paymentLinkFor(document);
  const buffer = await renderCommercialPdf({
    business,
    document,
    paymentUrl: payment.enabled ? payment.url : undefined,
    paymentDisclaimer: payment.enabled ? payment.disclaimer : undefined,
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.number}.pdf"`,
    },
  });
}
