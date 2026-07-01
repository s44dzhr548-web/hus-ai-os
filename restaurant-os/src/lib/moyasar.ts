import {
  getMoyasarSecretKey,
  isPlaceholderPaymentKey,
  moyasarKeysConfigured,
} from "@/lib/payment-keys";

export interface MoyasarPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  callback_url: string;
  source: {
    type: string;
    token?: string;
  };
  metadata?: Record<string, string>;
}

export interface MoyasarPaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  source: {
    type: string;
    company?: string;
    token?: string;
  };
  created_at: string;
  updated_at: string;
}

export const MOYASAR_PAYMENT_METHODS = [
  { type: "MADA", label: "مدى", icon: "💳" },
  { type: "APPLE_PAY", label: "Apple Pay", icon: "" },
  { type: "VISA", label: "Visa", icon: "💳" },
  { type: "MASTERCARD", label: "Mastercard", icon: "💳" },
] as const;

function resolveSecretKey(secretKey?: string | null): string {
  const envKey = getMoyasarSecretKey();
  if (envKey && !isPlaceholderPaymentKey(envKey)) return envKey;
  const dbKey = secretKey?.trim() || "";
  if (dbKey && !isPlaceholderPaymentKey(dbKey)) return dbKey;
  return "";
}

export function createMockMoyasarPayment(
  data: MoyasarPaymentRequest
): MoyasarPaymentResponse {
  const now = new Date().toISOString();
  return {
    id: `mock_${Date.now()}`,
    status: "paid",
    amount: data.amount,
    currency: data.currency,
    description: data.description,
    source: { type: data.source.type || "creditcard" },
    created_at: now,
    updated_at: now,
  };
}

export async function createMoyasarPayment(
  data: MoyasarPaymentRequest,
  secretKey?: string | null,
  options?: { testMode?: boolean }
): Promise<MoyasarPaymentResponse> {
  const key = resolveSecretKey(secretKey);

  if (options?.testMode || !key) {
    if (!key && !options?.testMode) {
      throw new Error("MOYASAR_SECRET_KEY is not configured");
    }
    return createMockMoyasarPayment(data);
  }

  const response = await fetch("https://api.moyasar.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Moyasar error: ${err}`);
  }

  return response.json();
}

export async function verifyMoyasarPayment(
  paymentId: string,
  secretKey?: string | null
): Promise<MoyasarPaymentResponse | null> {
  const key = resolveSecretKey(secretKey);

  if (!key) {
    return null;
  }

  if (paymentId.startsWith("mock_")) {
    return null;
  }

  const response = await fetch(
    `https://api.moyasar.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      },
    }
  );

  if (!response.ok) return null;
  return response.json();
}

export function mapMoyasarStatus(
  status: string
): "PENDING" | "PAID" | "FAILED" {
  switch (status) {
    case "paid":
      return "PAID";
    case "failed":
      return "FAILED";
    default:
      return "PENDING";
  }
}

export function mapPaymentMethod(
  method: string
): "MADA" | "APPLE_PAY" | "VISA" | "MASTERCARD" {
  switch (method?.toUpperCase()) {
    case "MADA":
      return "MADA";
    case "APPLE_PAY":
      return "APPLE_PAY";
    case "MASTERCARD":
      return "MASTERCARD";
    default:
      return "VISA";
  }
}

export function mapMoyasarMethod(
  sourceType: string,
  company?: string
): "MADA" | "APPLE_PAY" | "VISA" | "MASTERCARD" | "CASH" {
  const companyLower = company?.toLowerCase() || "";
  if (companyLower === "mada") return "MADA";
  if (companyLower === "mastercard") return "MASTERCARD";
  if (companyLower === "visa") return "VISA";

  switch (sourceType?.toLowerCase()) {
    case "mada":
      return "MADA";
    case "applepay":
    case "apple_pay":
      return "APPLE_PAY";
    case "mastercard":
      return "MASTERCARD";
    case "visa":
      return "VISA";
    default:
      return "VISA";
  }
}

export { moyasarKeysConfigured };
