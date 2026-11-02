import type { PaymentGateway, PaymentLinkRequest } from "./types";

export const flutterwaveGateway: PaymentGateway = {
  id: "flutterwave",
  label: "Flutterwave",
  buildStubLink(input: PaymentLinkRequest): string {
    const params = new URLSearchParams({
      tx_ref: input.reference,
      amount: String(input.amountMinor),
      currency: input.currency,
    });
    if (input.customerEmail) params.set("customer_email", input.customerEmail);
    return `https://checkout.flutterwave.com/pay/stub?${params.toString()}`;
  },
};
