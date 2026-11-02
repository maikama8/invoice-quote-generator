import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClientForm } from "@/components/record-forms";
import { PageHeader } from "@/components/page-header";
import { ConfirmSubmit } from "@/components/submit-button";
import { clientTitle } from "@/lib/views";
import { deleteClientAction } from "@/server/actions";
import { getClient } from "@/server/books";

export default function ClientPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Opening the client…</p>}>
      <ClientDetail params={props.params} />
    </Suspense>
  );
}

async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();
  return (
    <>
      <PageHeader eyebrow="Client" title={clientTitle(client)}>
        <form action={deleteClientAction.bind(null, client.id)}>
          <ConfirmSubmit message="Delete this client?">Delete</ConfirmSubmit>
        </form>
      </PageHeader>
      <ClientForm client={client} />
    </>
  );
}
