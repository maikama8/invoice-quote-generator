import { formatMinor } from "@/lib/format";

export function Money({
  minor,
  currency,
  className = "",
}: {
  minor: number;
  currency: string;
  className?: string;
}) {
  return <span className={`tabular-nums ${className}`}>{formatMinor(minor, currency)}</span>;
}
