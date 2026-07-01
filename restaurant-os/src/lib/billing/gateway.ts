import {
  getMoyasarBillingMode,
  getMoyasarPublishableKey,
  getMoyasarSecretKey,
  isPlaceholderPaymentKey,
  moyasarKeysConfigured,
} from "@/lib/payment-keys";

/**
 * Platform subscription billing gateway (Moyasar).
 * Keys are read exclusively from environment variables.
 */

export type BillingGatewayMode = "live" | "mock";

export interface BillingGatewayStatus {
  mode: BillingGatewayMode;
  provider: "moyasar";
  ready: boolean;
  missingKeys: string[];
  webhookConfigured: boolean;
  cronConfigured: boolean;
  supportedMethods: string[];
  webhookUrl: string;
  publishableKeyPrefix: string | null;
}

const REQUIRED_KEYS = [
  "MOYASAR_PUBLISHABLE_KEY",
  "MOYASAR_SECRET_KEY",
] as const;

export function getPlatformMoyasarKeys() {
  return {
    publishableKey: getMoyasarPublishableKey(),
    secretKey: getMoyasarSecretKey(),
    webhookSecret: (process.env.MOYASAR_WEBHOOK_SECRET || "").trim(),
    cronSecret: (process.env.CRON_SECRET || "").trim(),
  };
}

function keyValid(value: string): boolean {
  return value.length > 0 && !isPlaceholderPaymentKey(value);
}

export function getBillingGatewayMode(): BillingGatewayMode {
  const forced = getMoyasarBillingMode();
  if (forced === "mock") return "mock";
  if (forced === "live") {
    return moyasarKeysConfigured() ? "live" : "mock";
  }
  return moyasarKeysConfigured() ? "live" : "mock";
}

export function isLiveBilling(): boolean {
  return getBillingGatewayMode() === "live";
}

export function isMockBilling(): boolean {
  return !isLiveBilling();
}

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function billingWebhookUrl(): string {
  return `${appBaseUrl()}/api/billing/webhook`;
}

export function getBillingGatewayStatus(): BillingGatewayStatus {
  const keys = getPlatformMoyasarKeys();
  const missingKeys: string[] = [];

  if (!keyValid(keys.publishableKey)) missingKeys.push("MOYASAR_PUBLISHABLE_KEY");
  if (!keyValid(keys.secretKey)) missingKeys.push("MOYASAR_SECRET_KEY");
  if (!keyValid(keys.webhookSecret)) missingKeys.push("MOYASAR_WEBHOOK_SECRET");
  if (!keyValid(keys.cronSecret)) missingKeys.push("CRON_SECRET");

  const mode = getBillingGatewayMode();
  const requiredMissing = missingKeys.filter((k) =>
    (REQUIRED_KEYS as readonly string[]).includes(k)
  );

  const pub = keys.publishableKey;
  const publishableKeyPrefix =
    pub && keyValid(pub) ? `${pub.slice(0, 12)}...` : null;

  return {
    mode,
    provider: "moyasar",
    ready: mode === "live" && requiredMissing.length === 0,
    missingKeys,
    webhookConfigured: keyValid(keys.webhookSecret),
    cronConfigured: keyValid(keys.cronSecret),
    supportedMethods: ["MADA", "VISA", "MASTERCARD", "APPLE_PAY"],
    webhookUrl: billingWebhookUrl(),
    publishableKeyPrefix,
  };
}

export function assertLiveBillingReady(): { ok: true } | { ok: false; error: string; missingKeys: string[] } {
  const status = getBillingGatewayStatus();
  const requiredMissing = status.missingKeys.filter((k) =>
    (REQUIRED_KEYS as readonly string[]).includes(k)
  );
  if (requiredMissing.length) {
    return {
      ok: false,
      error: `Missing required keys: ${requiredMissing.join(", ")}`,
      missingKeys: requiredMissing,
    };
  }
  if (status.mode !== "live") {
    return {
      ok: false,
      error: "Set MOYASAR_BILLING_MODE=live and configure Moyasar keys.",
      missingKeys: status.missingKeys,
    };
  }
  return { ok: true };
}

export { REQUIRED_KEYS };
