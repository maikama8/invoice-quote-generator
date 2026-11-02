import { flutterwaveGateway } from "./flutterwave";
import { paystackGateway } from "./paystack";
import {
  PAYMENT_STUB_DISCLAIMER,
  type PaymentGateway,
  type PaymentLink,
  type PaymentProviderId,
} from "./types";

export type { PaymentGateway, PaymentLink, PaymentLinkRequest, PaymentProviderId } from "./types";

const GATEWAYS: Record<PaymentProviderId, PaymentGateway> = {
  paystack: paystackGateway,
  flutterwave: flutterwaveGateway,
};

export function isPaymentProvider(value: string): value is PaymentProviderId {
  return value === "paystack" || value === "flutterwave";
}

export function paymentGateway(id: PaymentProviderId): PaymentGateway {
  return GATEWAYS[id];
}

export function resolvePaymentLink(input: {
  linksEnabled: boolean;
  provider: string;
  reference: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  publicKey: string;
}): PaymentLink {
  if (!input.linksEnabled) {
    return {
      enabled: false,
      reason:
        "Payment links are disabled. Set PAYMENT_LINKS_ENABLED=true and choose a provider in Settings.",
    };
  }
  if (input.provider === "none" || input.provider === "") {
    return {
      enabled: false,
      reason: "No payment provider is selected. Choose Paystack or Flutterwave in Settings.",
    };
  }
  if (!isPaymentProvider(input.provider)) {
    return {
      enabled: false,
      reason: "This payment provider is not available.",
    };
  }
  const gateway = paymentGateway(input.provider);
  const url = gateway.buildStubLink({
    provider: input.provider,
    reference: input.reference,
    amountMinor: input.amountMinor,
    currency: input.currency,
    customerEmail: input.customerEmail,
    publicKey: input.publicKey,
  });
  return {
    enabled: true,
    provider: input.provider,
    mode: "stub",
    url,
    reference: input.reference,
    disclaimer: PAYMENT_STUB_DISCLAIMER,
  };
}
