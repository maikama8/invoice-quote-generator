import {
  convertQuoteAction,
  deleteInvoiceAction,
  deleteQuoteAction,
  invoiceStatusAction,
  quoteStatusAction,
} from "@/server/actions";
import type { CommercialDocument } from "@/lib/views";
import { ConfirmSubmit, SubmitButton } from "./submit-button";

export function DocumentMenu({ document }: { document: CommercialDocument }) {
  const id = document.id;
  const pdf = document.kind === "invoice" ? `/api/invoices/${id}/pdf` : `/api/quotes/${id}/pdf`;
  return (
    <>
      <a className="btn-secondary" href={pdf}>
        Download PDF
      </a>
      {document.kind === "quote" && document.status === "draft" ? (
        <form action={quoteStatusAction.bind(null, id, "sent")}>
          <SubmitButton>Mark sent</SubmitButton>
        </form>
      ) : null}
      {document.kind === "quote" && document.status === "sent" ? (
        <>
          <form action={quoteStatusAction.bind(null, id, "accepted")}>
            <SubmitButton>Mark accepted</SubmitButton>
          </form>
          <form action={quoteStatusAction.bind(null, id, "declined")}>
            <SubmitButton variant="secondary">Mark declined</SubmitButton>
          </form>
        </>
      ) : null}
      {document.kind === "quote" && (document.status === "declined" || document.status === "expired") ? (
        <form action={quoteStatusAction.bind(null, id, "draft")}>
          <SubmitButton variant="secondary">Reopen as draft</SubmitButton>
        </form>
      ) : null}
      {document.kind === "quote" &&
      (document.status === "draft" || document.status === "sent" || document.status === "accepted") ? (
        <form action={convertQuoteAction.bind(null, id)}>
          <SubmitButton>Convert to invoice</SubmitButton>
        </form>
      ) : null}
      {document.kind === "quote" && document.status === "draft" ? (
        <form action={deleteQuoteAction.bind(null, id)}>
          <ConfirmSubmit message="Delete this draft quote?">Delete draft</ConfirmSubmit>
        </form>
      ) : null}
      {document.kind === "invoice" && document.status === "draft" ? (
        <form action={invoiceStatusAction.bind(null, id, "sent")}>
          <SubmitButton>Mark sent</SubmitButton>
        </form>
      ) : null}
      {document.kind === "invoice" && (document.status === "sent" || document.status === "overdue") ? (
        <form action={invoiceStatusAction.bind(null, id, "paid")}>
          <SubmitButton>Mark paid</SubmitButton>
        </form>
      ) : null}
      {document.kind === "invoice" && document.status === "draft" ? (
        <form action={deleteInvoiceAction.bind(null, id)}>
          <ConfirmSubmit message="Delete this draft invoice? A converted quote returns to accepted.">
            Delete draft
          </ConfirmSubmit>
        </form>
      ) : null}
    </>
  );
}
