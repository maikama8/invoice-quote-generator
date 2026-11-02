export type PaymentProviderId = "paystack" | "flutterwave";

export type PaymentLinkRequest = {
  provider: PaymentProviderId;
  reference: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  /** Reserved for a live adapter. Stubs must not place this on the URL. */
  publicKey: string;
};

export type PaymentLink =
  | {
      enabled: true;
      provider: PaymentProviderId;
      mode: "stub";
      url: string;
      reference: string;
      disclaimer: string;
    }
  | {
      enabled: false;
      reason: string;
    };

export interface PaymentGateway {
  id: PaymentProviderId;
  label: string;
  buildStubLink(input: PaymentLinkRequest): string;
}

export const PAYMENT_STUB_DISCLAIMER =
  "Stub link. Daybook does not contact the provider, and opening it will not take a payment.";
