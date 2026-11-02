import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/record-forms";
import { appConfig } from "@/lib/config";
import { getBusiness } from "@/server/books";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading settings…</p>}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const settings = await getBusiness();
  const links = appConfig().paymentLinksEnabled;
  return (
    <>
      <PageHeader
        eyebrow="Studio"
        title="Settings"
        lede={
          links
            ? "Payment link stubs are switched on. A provider still has to be selected below."
            : "Payment link stubs are off. Set PAYMENT_LINKS_ENABLED=true to build stub URLs. No secret keys are required."
        }
      />
      <SettingsForm settings={settings} />
    </>
  );
}
