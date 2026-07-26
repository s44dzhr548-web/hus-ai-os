import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import { parseOAuthState } from "@/lib/marketing/ads-oauth";
import {
  exchangeGoogleOAuthCode,
  googleOAuthPostConnectMessage,
} from "@/lib/marketing/google-ads-oauth-service";
import { logMarketingAudit } from "@/lib/marketing/security";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const base = resolveAppBaseUrl();
  const platformsUrl = `${base}/dashboard/marketing/platforms`;

  const err = req.nextUrl.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(`${platformsUrl}?error=oauth_denied&platform=google`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(`${platformsUrl}?error=oauth_denied&platform=google`);
  }

  const parsed = parseOAuthState(state);
  if (!parsed || parsed.platform !== "GOOGLE") {
    return NextResponse.redirect(`${platformsUrl}?error=invalid_state&platform=google`);
  }

  if (!canEncryptTokens()) {
    return NextResponse.redirect(`${platformsUrl}?error=not_configured&platform=google`);
  }

  try {
    const tokens = await exchangeGoogleOAuthCode(code);
    const accessEnc = encryptToken(tokens.accessToken);
    const refreshEnc = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;
    const pendingDevToken = googleOAuthPostConnectMessage();

    await prisma.marketingAdConnection.upsert({
      where: {
        restaurantId_platform: {
          restaurantId: parsed.restaurantId,
          platform: "GOOGLE",
        },
      },
      create: {
        restaurantId: parsed.restaurantId,
        platform: "GOOGLE",
        accessTokenEnc: accessEnc,
        refreshTokenEnc: refreshEnc,
        tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        scopes: ["https://www.googleapis.com/auth/adwords"],
        isActive: true,
        connectedAt: new Date(),
        accountId: "google-oauth",
        accountName: "Google Ads",
        syncStatus: pendingDevToken ? "CONNECTED_PENDING_DEV_TOKEN" : "CONNECTED",
        lastSyncAt: new Date(),
      },
      update: {
        accessTokenEnc: accessEnc,
        refreshTokenEnc: refreshEnc,
        tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        isActive: true,
        connectedAt: new Date(),
        syncStatus: pendingDevToken ? "CONNECTED_PENDING_DEV_TOKEN" : "CONNECTED",
        lastSyncAt: new Date(),
      },
    });

    await logMarketingAudit({
      restaurantId: parsed.restaurantId,
      action: "OAUTH_CONNECT",
      entityType: "MarketingAdConnection",
      details: { platform: "GOOGLE", pendingDeveloperToken: Boolean(pendingDevToken) },
    });

    const params = new URLSearchParams({
      connected: "google",
      success: "1",
    });
    if (pendingDevToken) params.set("google_campaigns", "pending_dev_token");

    return NextResponse.redirect(`${platformsUrl}?${params.toString()}`);
  } catch {
    return NextResponse.redirect(`${platformsUrl}?error=oauth_failed&platform=google`);
  }
}
