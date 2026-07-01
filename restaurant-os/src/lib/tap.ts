import { isPlaceholderPaymentKey } from "@/lib/payment-keys";

export interface TapPaymentResult {
  id: string;
  status: "PAID" | "PENDING" | "FAILED";
  amount: number;
  currency: string;
}

export async function processTapPayment(
  data: {
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, string>;
  },
  secretKey?: string | null
): Promise<TapPaymentResult> {
  if (!secretKey || isPlaceholderPaymentKey(secretKey)) {
    throw new Error("Tap secret key is not configured");
  }

  const response = await fetch("https://api.tap.company/v2/charges", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      metadata: data.metadata,
    }),
  });

  if (!response.ok) throw new Error("Tap payment failed");
  const result = await response.json();
  return {
    id: result.id,
    status: result.status === "CAPTURED" ? "PAID" : "FAILED",
    amount: data.amount,
    currency: data.currency,
  };
}

export const TAP_PAYMENT_METHODS = [
  { type: "MADA", label: "مدى" },
  { type: "VISA", label: "Visa" },
  { type: "MASTERCARD", label: "Mastercard" },
  { type: "APPLE_PAY", label: "Apple Pay" },
] as const;
