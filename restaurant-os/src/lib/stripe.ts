import { isPlaceholderPaymentKey } from "@/lib/payment-keys";

export interface StripePaymentResult {
  id: string;
  status: "PAID" | "PENDING" | "FAILED";
  amount: number;
  currency: string;
}

export async function processStripePayment(
  data: {
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, string>;
  },
  secretKey?: string | null
): Promise<StripePaymentResult> {
  if (!secretKey || isPlaceholderPaymentKey(secretKey)) {
    throw new Error("Stripe secret key is not configured");
  }

  const params = new URLSearchParams();
  params.append("amount", String(data.amount));
  params.append("currency", data.currency);
  params.append("description", data.description);
  if (data.metadata) {
    Object.entries(data.metadata).forEach(([k, v]) =>
      params.append(`metadata[${k}]`, v)
    );
  }

  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) throw new Error("Stripe payment failed");
  const result = await response.json();
  return {
    id: result.id,
    status: result.status === "succeeded" ? "PAID" : "PENDING",
    amount: data.amount,
    currency: data.currency,
  };
}

export const STRIPE_PAYMENT_METHODS = [
  { type: "VISA", label: "Visa" },
  { type: "MASTERCARD", label: "Mastercard" },
  { type: "APPLE_PAY", label: "Apple Pay" },
] as const;
