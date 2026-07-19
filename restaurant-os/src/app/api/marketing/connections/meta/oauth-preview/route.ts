import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { resolveAdsIntegration } from "@/lib/platform/ads-integrations";
import {
  getMetaAdsOAuthRedirectUri,
  isValidMetaAppId,
  sanitizeMetaAppIdForLog,
} from "@/lib/platform/meta-ads-env";
import { getOAuthStartUrl } from "@/lib/marketing/ads-oauth";

export const dynamic = "force-dynamic";

/** Platform admin — OAuth URL diagnostics (no secrets). */
export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const creds = await resolveAdsIntegration("META");
  const redirectUri = getMetaAdsOAuthRedirectUri();
  const appIdValid = isValidMetaAppId(creds.clientId);

  let sampleOAuthUrl: string | null = null;
  if (appIdValid && creds.clientSecret) {
    sampleOAuthUrl = await getOAuthStartUrl("META", "preview-restaurant-id");
  }

  return NextResponse.json({
    ok: appIdValid && Boolean(creds.clientSecret),
    appId: sanitizeMetaAppIdForLog(creds.clientId),
    appIdValid,
    hasSecret: Boolean(creds.clientSecret),
    redirectUri,
    source: creds.source,
    oauthReady: Boolean(creds.clientId && creds.clientSecret && appIdValid),
    sampleOAuthUrl: sampleOAuthUrl
      ? sampleOAuthUrl.replace(/client_id=[^&]+/, `client_id=${sanitizeMetaAppIdForLog(creds.clientId)}`)
      : null,
    requiredEnv: ["META_APP_ID", "META_APP_SECRET", "META_ADS_REDIRECT_URI"],
  });
}
