import { describe, expect, it } from "vitest";
import { resolvePaymentLink } from "../src/lib/payments";

const base = {
  reference: "INV-2026-0003",
  amountMinor: 168_506_250,
  currency: "NGN",
  customerEmail: "finance@atlanticschools.edu.ng",
  publicKey: "pk_test_should_not_leak",
};

describe("payment link stubs", () => {
  it("stays disabled when the environment flag is off", () => {
    const link = resolvePaymentLink({
      ...base,
      linksEnabled: false,
      provider: "paystack",
    });
    expect(link.enabled).toBe(false);
    if (!link.enabled) expect(link.reason).toMatch(/disabled/i);
  });

  it("stays disabled when no provider is selected", () => {
    const link = resolvePaymentLink({
      ...base,
      linksEnabled: true,
      provider: "none",
    });
    expect(link.enabled).toBe(false);
  });

  it("builds a Paystack stub without the public key", () => {
    const link = resolvePaymentLink({
      ...base,
      linksEnabled: true,
      provider: "paystack",
    });
    expect(link.enabled).toBe(true);
    if (link.enabled) {
      expect(link.mode).toBe("stub");
      expect(link.provider).toBe("paystack");
      expect(link.url).toContain("https://checkout.paystack.com/pay/stub?");
      expect(link.url).toContain("reference=INV-2026-0003");
      expect(link.url).toContain("amount=168506250");
      expect(link.url).toContain("currency=NGN");
      expect(link.url).not.toContain("pk_test");
      expect(link.disclaimer).toMatch(/will not take a payment/i);
    }
  });

  it("builds a Flutterwave stub", () => {
    const link = resolvePaymentLink({
      ...base,
      linksEnabled: true,
      provider: "flutterwave",
      publicKey: "",
    });
    expect(link.enabled).toBe(true);
    if (link.enabled) {
      expect(link.url).toContain("https://checkout.flutterwave.com/pay/stub?");
      expect(link.url).toContain("tx_ref=INV-2026-0003");
      expect(link.url).toContain("customer_email=");
    }
  });

  it("rejects an unknown provider", () => {
    const link = resolvePaymentLink({
      ...base,
      linksEnabled: true,
      provider: "stripe",
    });
    expect(link.enabled).toBe(false);
  });
});
