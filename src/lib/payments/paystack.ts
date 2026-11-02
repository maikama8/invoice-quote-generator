import type { PaymentGateway, PaymentLinkRequest } from "./types";

export const paystackGateway: PaymentGateway = {
  id: "paystack",
  label: "Paystack",
  buildStubLink(input: PaymentLinkRequest): string {
    const params = new URLSearchParams({
      reference: input.reference,
      amount: String(input.amountMinor),
      currency: input.currency,
    });
    if (input.customerEmail) params.set("email", input.customerEmail);
    return `https://checkout.paystack.com/pay/stub?${params.toString()}`;
  },
};
