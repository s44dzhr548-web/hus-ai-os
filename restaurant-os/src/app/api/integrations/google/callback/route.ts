import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import {
  exchangeGoogleOAuthCode,
  fetchGoogleAuthorizedProfile,
  getGoogleAdsManagerCustomerId,
  googleOAuthPostConnectMessage,
  parseGoogleOAuthState,
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

  const parsed = parseGoogleOAuthState(state);
  if (!parsed) {
    return NextResponse.redirect(`${platformsUrl}?error=invalid_state&platform=google`);
  }

  if (!canEncryptTokens()) {
    return NextResponse.redirect(`${platformsUrl}?error=not_configured&platform=google`);
  }

  try {
    const tokens = await exchangeGoogleOAuthCode(code);
    const profile = await fetchGoogleAuthorizedProfile(tokens.accessToken);
    const managerCustomerId = getGoogleAdsManagerCustomerId();

    const existing = await prisma.marketingAdConnection.findUnique({
      where: {
        restaurantId_platform: {
          restaurantId: parsed.restaurantId,
          platform: "GOOGLE",
        },
      },
    });

    const accessEnc = encryptToken(tokens.accessToken);
    const refreshEnc = tokens.refreshToken
      ? encryptToken(tokens.refreshToken)
      : existing?.refreshTokenEnc ?? null;

    const pendingDevToken = googleOAuthPostConnectMessage();
    const accountLabel = profile.email || profile.name || "Google Ads";
    const accountId = managerCustomerId || existing?.accountId || "google-oauth";

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
        connectedByUserId: parsed.userId ?? null,
        accountId,
        accountName: accountLabel,
        businessName: profile.name,
        syncStatus: pendingDevToken ? "CONNECTED_PENDING_DEV_TOKEN" : "CONNECTED",
        lastSyncAt: new Date(),
        metadataJson: {
          authorizedEmail: profile.email,
          managerCustomerId: managerCustomerId ?? undefined,
        },
      },
      update: {
        accessTokenEnc: accessEnc,
        ...(tokens.refreshToken ? { refreshTokenEnc: refreshEnc } : {}),
        tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        isActive: true,
        connectedAt: new Date(),
        connectedByUserId: parsed.userId ?? existing?.connectedByUserId ?? null,
        accountId,
        accountName: accountLabel,
        businessName: profile.name ?? existing?.businessName,
        syncStatus: pendingDevToken ? "CONNECTED_PENDING_DEV_TOKEN" : "CONNECTED",
        lastSyncAt: new Date(),
        metadataJson: {
          authorizedEmail: profile.email,
          managerCustomerId: managerCustomerId ?? undefined,
        },
      },
    });

    await logMarketingAudit({
      restaurantId: parsed.restaurantId,
      userId: parsed.userId,
      action: "OAUTH_CONNECT",
      entityType: "MarketingAdConnection",
      details: {
        platform: "GOOGLE",
        pendingDeveloperToken: Boolean(pendingDevToken),
        hasRefreshToken: Boolean(refreshEnc),
      },
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
