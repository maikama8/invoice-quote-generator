import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-1 font-serif text-4xl tracking-tight text-balance">{title}</h1>
        {lede ? <p className="mt-2 text-ink-soft">{lede}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </header>
  );
}
