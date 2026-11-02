import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { formatRate } from "@/lib/format";
import { getBusiness } from "@/server/books";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: "Daybook",
    template: "%s · Daybook",
  },
  description: "Quotes and invoices with VAT, multi-currency totals, and branded PDFs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Suspense fallback={<div className="min-h-screen bg-paper" />}>
          <Shell
            meta={
              <Suspense fallback={<span>Opening the books…</span>}>
                <SidebarMeta />
              </Suspense>
            }
          >
            {children}
          </Shell>
        </Suspense>
      </body>
    </html>
  );
}

async function SidebarMeta() {
  const business = await getBusiness();
  return (
    <>
      <p className="text-paper">{business.tradingName}</p>
      <p>
        {business.taxName} {formatRate(business.taxRateBps)} · {business.defaultCurrency}
      </p>
    </>
  );
}
