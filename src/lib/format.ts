import { BPS_SCALE } from "./constants";

export function formatMinor(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

/** Currency code plus amount. PDF fonts often lack the naira sign. */
export function formatMinorCode(minor: number, currency: string): string {
  const amount = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
  return `${currency} ${amount}`;
}

export function formatRate(basisPoints: number): string {
  const percent = basisPoints / (BPS_SCALE / 100);
  const text = percent.toLocaleString("en-NG", {
    minimumFractionDigits: Number.isInteger(percent) ? 0 : 1,
    maximumFractionDigits: 2,
  });
  return `${text}%`;
}

export function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
