import { renderCommercialPdf } from "@/lib/pdf/document-pdf";
import { getBusiness, getQuote } from "@/server/books";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const document = await getQuote(id);
  if (!document) return new Response("Quote not found", { status: 404 });
  const business = await getBusiness();
  const buffer = await renderCommercialPdf({ business, document });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.number}.pdf"`,
    },
  });
}
