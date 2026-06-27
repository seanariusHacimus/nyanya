import { randomUUID } from "crypto";

/**
 * Payment provider abstraction (plan §8). Mock-first behind a clean interface so
 * Payme / Click / Uzum slot in later with no call-site changes.
 */
export type PaymentPurpose =
  | "specialist_listing"
  | "contact_unlock"
  | "unlock_package"
  | "subscription";

export interface CreateChargeInput {
  userId: string;
  purpose: PaymentPurpose;
  amount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface ChargeResult {
  providerTxnId: string;
  checkoutUrl?: string;
  status: "paid" | "pending" | "failed";
}

export interface PaymentProvider {
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
}

class MockPaymentProvider implements PaymentProvider {
  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    // Sandbox: instant success, plus a fail path for testing the unhappy flow.
    const fail = input.metadata?.fail === true;
    return {
      providerTxnId: `mock_${randomUUID()}`,
      status: fail ? "failed" : "paid",
    };
  }
}

function resolveProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER) {
    // case "payme": return new PaymeProvider();
    // case "click": return new ClickProvider();
    // case "uzum": return new UzumProvider();
    default:
      return new MockPaymentProvider();
  }
}

export const paymentProvider = resolveProvider();
export const PROVIDER_NAME = (process.env.PAYMENT_PROVIDER ?? "mock") as
  | "mock"
  | "payme"
  | "click"
  | "uzum";
export const UNLOCK_FEE = Number(process.env.UNLOCK_FEE_UZS ?? 29000);
export const LISTING_FEE = Number(process.env.LISTING_FEE_UZS ?? 149000);
