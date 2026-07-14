import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import {
  parseOAuthState,
  exchangeOAuthCode,
  discoverAdAccount,
} from "@/lib/marketing/ads-oauth";
import { ADS_INTEGRATION_DEFS } from "@/lib/platform/ads-integrations";
import { logMarketingAudit } from "@/lib/marketing/security";
import type { MarketingPlatform } from "@prisma/client";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform: platformParam } = await params;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const base = resolveAppBaseUrl();
  const redirectOk = `${base}/dashboard/marketing/platforms?connected=${platformParam}`;

  if (!code || !state) {
    return NextResponse.redirect(`${base}/dashboard/marketing/platforms?error=oauth_denied`);
  }

  const parsed = parseOAuthState(state);
  if (!parsed) {
    return NextResponse.redirect(`${base}/dashboard/marketing/platforms?error=invalid_state`);
  }

  const platform = platformParam.toUpperCase() as MarketingPlatform;

  if (!canEncryptTokens()) {
    return NextResponse.redirect(`${base}/dashboard/marketing/platforms?error=not_configured`);
  }

  try {
    const tokens = await exchangeOAuthCode(platform, code);
    const account = await discoverAdAccount(platform, tokens.accessToken);
    const key = platformParam.toUpperCase();
    const def = ADS_INTEGRATION_DEFS[key as keyof typeof ADS_INTEGRATION_DEFS];
    const scopes = def?.defaultScopes ?? [];

    const accessEnc = encryptToken(tokens.accessToken);
    const refreshEnc = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

    await prisma.marketingAdConnection.upsert({
      where: {
        restaurantId_platform: {
          restaurantId: parsed.restaurantId,
          platform,
        },
      },
      create: {
        restaurantId: parsed.restaurantId,
        platform,
        accessTokenEnc: accessEnc,
        refreshTokenEnc: refreshEnc,
        tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        scopes,
        isActive: true,
        connectedAt: new Date(),
        accountId: account?.accountId ?? null,
        accountName: account?.accountName ?? null,
        businessName: account?.businessName ?? null,
        currency: account?.currency ?? null,
        timezone: account?.timezone ?? null,
        syncStatus: "CONNECTED",
        lastSyncAt: new Date(),
      },
      update: {
        accessTokenEnc: accessEnc,
        refreshTokenEnc: refreshEnc,
        tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        isActive: true,
        connectedAt: new Date(),
        accountId: account?.accountId ?? null,
        accountName: account?.accountName ?? null,
        businessName: account?.businessName ?? null,
        currency: account?.currency ?? null,
        timezone: account?.timezone ?? null,
        syncStatus: "CONNECTED",
        lastSyncAt: new Date(),
      },
    });

    await logMarketingAudit({
      restaurantId: parsed.restaurantId,
      action: "OAUTH_CONNECT",
      entityType: "MarketingAdConnection",
      details: { platform, accountName: account?.accountName },
    });

    return NextResponse.redirect(`${redirectOk}&success=1`);
  } catch {
    return NextResponse.redirect(`${base}/dashboard/marketing/platforms?error=oauth_failed`);
  }
}
