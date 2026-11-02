export const CURRENCIES = [
  { code: "NGN", name: "Nigerian naira", symbol: "₦" },
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "GBP", name: "British pound", symbol: "£" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GHS", name: "Ghanaian cedi", symbol: "GH₵" },
  { code: "KES", name: "Kenyan shilling", symbol: "KSh" },
  { code: "ZAR", name: "South African rand", symbol: "R" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const CODES = new Set<string>(CURRENCIES.map((currency) => currency.code));

export function isCurrencyCode(value: string): value is CurrencyCode {
  return CODES.has(value);
}

export function currencyName(code: string): string {
  return CURRENCIES.find((currency) => currency.code === code)?.name ?? code;
}

/** NGN first, then the rest in list order. Unknown codes follow, sorted. */
export function sortCurrencies(codes: Iterable<string>): string[] {
  const present = new Set(codes);
  const known = CURRENCIES.map((currency) => currency.code).filter((code) => present.has(code));
  const extra = [...present].filter((code) => !isCurrencyCode(code)).sort();
  return [...known, ...extra];
}
