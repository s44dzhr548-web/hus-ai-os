import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";

/** Canonical Meta Ads OAuth callback path for Menu OS production. */
export const META_ADS_CALLBACK_PATH = "/api/integrations/meta/callback";

const META_APP_ID_ENV_KEYS = ["META_APP_ID", "META_ADS_CLIENT_ID"] as const;
const META_APP_SECRET_ENV_KEYS = ["META_APP_SECRET", "META_ADS_CLIENT_SECRET"] as const;

export function isValidMetaAppId(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return false;
  return /^\d{8,20}$/.test(v);
}

function firstEnv(keys: readonly string[]): string | null {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

export function getMetaAdsOAuthRedirectUri(): string {
  const override = process.env.META_ADS_REDIRECT_URI?.trim();
  if (override) return override;
  return `${resolveAppBaseUrl()}${META_ADS_CALLBACK_PATH}`;
}

export function resolveMetaAdsEnvCredentials(): {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string;
  source: "environment" | "none";
} {
  return {
    clientId: firstEnv(META_APP_ID_ENV_KEYS),
    clientSecret: firstEnv(META_APP_SECRET_ENV_KEYS),
    redirectUri: getMetaAdsOAuthRedirectUri(),
    source: firstEnv(META_APP_ID_ENV_KEYS) ? "environment" : "none",
  };
}

export function sanitizeMetaAppIdForLog(clientId: string | null): string {
  if (!clientId) return "(empty)";
  if (!isValidMetaAppId(clientId)) return "(invalid-format)";
  if (clientId.length <= 8) return `${clientId.slice(0, 2)}***`;
  return `${clientId.slice(0, 4)}…${clientId.slice(-4)}`;
}
