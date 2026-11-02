export type AppConfig = {
  timeZone: string;
  paymentLinksEnabled: boolean;
  paystackPublicKey: string;
  flutterwavePublicKey: string;
  databaseUrl: string;
};

function read(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function appConfig(): AppConfig {
  const timeZone = read("APP_TIMEZONE") ?? "Africa/Lagos";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    throw new Error(`APP_TIMEZONE is not an IANA time zone: ${timeZone}`);
  }
  return {
    timeZone,
    paymentLinksEnabled: read("PAYMENT_LINKS_ENABLED") === "true",
    paystackPublicKey: read("PAYSTACK_PUBLIC_KEY") ?? "",
    flutterwavePublicKey: read("FLUTTERWAVE_PUBLIC_KEY") ?? "",
    databaseUrl: read("DATABASE_URL") ?? "file:./prisma/dev.db",
  };
}
