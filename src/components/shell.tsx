"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/quotes", label: "Quotes" },
  { href: "/invoices", label: "Invoices" },
  { href: "/clients", label: "Clients" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/settings", label: "Settings" },
];

function active(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children, meta }: { children: ReactNode; meta: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="grid gap-1">
      {LINKS.map((link) => {
        const on = active(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={`rounded-md px-3 py-2 text-sm ${
              on ? "bg-white/10 text-paper" : "text-paper/70 hover:bg-white/5 hover:text-paper"
            }`}
            aria-current={on ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-full md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-sidebar px-4 py-6 text-paper md:flex">
        <Link href="/" className="mb-8 block px-3">
          <span className="font-serif text-2xl tracking-tight">Daybook</span>
          <span className="mt-1 block text-xs tracking-[0.16em] text-gold uppercase">Ledger</span>
        </Link>
        {nav}
        <div className="mt-auto px-3 pt-6 text-xs leading-5 text-paper/60">{meta}</div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-rule bg-sidebar px-4 py-3 text-paper md:hidden">
          <Link href="/" className="font-serif text-xl">
            Daybook
          </Link>
          <button
            type="button"
            className="rounded-full border border-white/20 px-3 py-1 text-sm"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
        {open ? <div className="border-b border-rule bg-sidebar px-4 py-3 md:hidden">{nav}</div> : null}
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
