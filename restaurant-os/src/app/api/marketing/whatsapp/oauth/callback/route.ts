import { NextRequest, NextResponse } from "next/server";
import { canEncryptTokens } from "@/lib/marketing/encryption";
import {
  exchangeOAuthCode,
  parseWhatsAppOAuthState,
  whatsAppOAuthConfigured,
} from "@/lib/marketing/whatsapp-oauth";
import { storeOAuthDiscovery } from "@/lib/marketing/whatsapp-setup";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = resolveAppBaseUrl();
  const setupUrl = `${base}/dashboard/marketing/whatsapp/setup`;

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${setupUrl}?step=2&error=oauth_denied`);
  }

  if (!(await whatsAppOAuthConfigured()) || !canEncryptTokens()) {
    return NextResponse.redirect(`${setupUrl}?step=2&error=not_configured`);
  }

  const parsed = parseWhatsAppOAuthState(state);
  if (!parsed) {
    return NextResponse.redirect(`${setupUrl}?step=2&error=invalid_state`);
  }

  try {
    const { accessToken } = await exchangeOAuthCode(code);
    const discovered = await storeOAuthDiscovery(parsed.restaurantId, accessToken);
    const step = discovered.phones.length === 0 ? 2 : discovered.phones.length === 1 ? 4 : 3;
    return NextResponse.redirect(`${setupUrl}?step=${step}&oauth=success`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(`${setupUrl}?step=2&error=${encodeURIComponent(msg)}`);
  }
}
