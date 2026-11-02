import { ClientForm } from "@/components/record-forms";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <>
      <PageHeader eyebrow="Address book" title="New client" lede="A company, a person, or both." />
      <ClientForm />
    </>
  );
}
