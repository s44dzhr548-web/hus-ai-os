import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import { parseOAuthState } from "@/lib/marketing/ads-oauth";
import { ADS_INTEGRATION_DEFS } from "@/lib/platform/ads-integrations";
import { logMarketingAudit } from "@/lib/marketing/security";
import type { MarketingPlatform } from "@prisma/client";
import { resolveAppBaseUrl } from "@/lib/after-visit-whatsapp/review-url";
import {
  exchangeMetaOAuthCode,
  fetchMetaAdAccounts,
  metaConnectionMetadata,
  type MetaAdAccountRecord,
} from "@/lib/marketing/meta-oauth-service";

async function persistMetaConnection(params: {
  restaurantId: string;
  platform: MarketingPlatform;
  account: MetaAdAccountRecord;
  accessEnc: string;
  refreshEnc: string | null;
  expiresIn: number | null;
  scopes: string[];
  userId?: string;
}) {
  const { restaurantId, platform, account, accessEnc, refreshEnc, expiresIn, scopes } = params;
  const meta = metaConnectionMetadata(account);

  await prisma.marketingAdConnection.upsert({
    where: {
      restaurantId_platform: { restaurantId, platform },
    },
    create: {
      restaurantId,
      platform,
      accessTokenEnc: accessEnc,
      refreshTokenEnc: refreshEnc,
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      scopes,
      isActive: true,
      connectedAt: new Date(),
      connectedByUserId: params.userId ?? null,
      accountId: account.accountId,
      accountName: account.accountName,
      businessName: account.businessName,
      currency: account.currency,
      timezone: account.timezone,
      syncStatus: "CONNECTED",
      lastSyncAt: new Date(),
      metadataJson: meta,
    },
    update: {
      accessTokenEnc: accessEnc,
      refreshTokenEnc: refreshEnc,
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      isActive: true,
      connectedAt: new Date(),
      connectedByUserId: params.userId ?? null,
      accountId: account.accountId,
      accountName: account.accountName,
      businessName: account.businessName,
      currency: account.currency,
      timezone: account.timezone,
      syncStatus: "CONNECTED",
      lastSyncAt: new Date(),
      metadataJson: meta,
    },
  });

  await logMarketingAudit({
    restaurantId,
    userId: params.userId,
    action: "OAUTH_CONNECT",
    entityType: "MarketingAdConnection",
    details: {
      platform,
      accountName: account.accountName,
      businessId: account.businessId,
      adAccountId: account.accountId,
    },
  });
}

export async function handleMetaAdsOAuthCallback(req: NextRequest, platformParam: string) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const base = resolveAppBaseUrl();
  const redirectBase = `${base}/dashboard/marketing/platforms`;

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?error=oauth_denied`);
  }

  const parsed = parseOAuthState(state);
  if (!parsed) {
    return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
  }

  const platform = platformParam.toUpperCase() as MarketingPlatform;

  if (!canEncryptTokens()) {
    return NextResponse.redirect(`${redirectBase}?error=not_configured`);
  }

  try {
    const tokens = await exchangeMetaOAuthCode(code);
    const accounts = await fetchMetaAdAccounts(tokens.accessToken);
    const def = ADS_INTEGRATION_DEFS.META;
    const scopes = def.defaultScopes;

    const accessEnc = encryptToken(tokens.accessToken);
    const refreshEnc = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

    if (accounts.length === 0) {
      return NextResponse.redirect(`${redirectBase}?error=no_ad_accounts`);
    }

    if (accounts.length === 1) {
      await persistMetaConnection({
        restaurantId: parsed.restaurantId,
        platform,
        account: accounts[0],
        accessEnc,
        refreshEnc,
        expiresIn: tokens.expiresIn,
        scopes,
      });

      return NextResponse.redirect(`${redirectBase}?connected=${platformParam}&success=1`);
    }

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
        isActive: false,
        syncStatus: "PENDING_ACCOUNT",
        metadataJson: { pendingAccounts: accounts },
      },
      update: {
        accessTokenEnc: accessEnc,
        refreshTokenEnc: refreshEnc,
        tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        isActive: false,
        syncStatus: "PENDING_ACCOUNT",
        metadataJson: { pendingAccounts: accounts },
        accountId: null,
        accountName: null,
        businessName: null,
      },
    });

    return NextResponse.redirect(`${redirectBase}?selectAccount=${platformParam}&success=oauth`);
  } catch {
    return NextResponse.redirect(`${redirectBase}?error=oauth_failed`);
  }
}
