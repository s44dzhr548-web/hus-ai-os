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
  fetchMetaBusinesses,
  metaConnectionMetadata,
  type MetaAdAccountRecord,
} from "@/lib/marketing/meta-oauth-service";
import {
  MetaOAuthError,
  type MetaOAuthErrorCode,
} from "@/lib/marketing/meta-oauth-errors";
import { logMetaOAuthStage, sanitizeGraphErrorMessage } from "@/lib/marketing/meta-oauth-callback-log";
import { getCanonicalMetaRedirectUri } from "@/lib/platform/meta-ads-env";

function platformsRedirect(code: MetaOAuthErrorCode, detail?: string): NextResponse {
  const base = resolveAppBaseUrl();
  const url = new URL(`${base}/dashboard/marketing/platforms`);
  url.searchParams.set("error", code);
  if (detail) {
    url.searchParams.set("detail", detail.slice(0, 180));
  }
  return NextResponse.redirect(url.toString());
}

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
  logMetaOAuthStage("callback_received", {
    redirectUri: getCanonicalMetaRedirectUri(),
    hasCode: Boolean(req.nextUrl.searchParams.get("code")),
    hasState: Boolean(req.nextUrl.searchParams.get("state")),
    fbError: req.nextUrl.searchParams.get("error"),
  });

  const fbError = req.nextUrl.searchParams.get("error");
  if (fbError) {
    logMetaOAuthStage("oauth_denied", { fbError });
    return platformsRedirect("oauth_denied");
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code) {
    logMetaOAuthStage("missing_code");
    return platformsRedirect("missing_code");
  }

  logMetaOAuthStage("code_received", { codeLength: code.length });

  if (!state) {
    logMetaOAuthStage("invalid_state", { reason: "missing_state" });
    return platformsRedirect("invalid_state");
  }

  const parsed = parseOAuthState(state);
  if (!parsed) {
    logMetaOAuthStage("invalid_state", { reason: "parse_failed" });
    return platformsRedirect("invalid_state");
  }

  logMetaOAuthStage("state_validated", { restaurantId: parsed.restaurantId });

  const platform = platformParam.toUpperCase() as MarketingPlatform;
  const redirectBase = `${resolveAppBaseUrl()}/dashboard/marketing/platforms`;

  if (!canEncryptTokens()) {
    logMetaOAuthStage("encryption_not_configured");
    return platformsRedirect("encryption_not_configured");
  }

  try {
    const tokens = await exchangeMetaOAuthCode(code);

    const businesses = await fetchMetaBusinesses(tokens.accessToken).catch((err) => {
      logMetaOAuthStage("businesses_fetch_skipped", {
        reason: err instanceof MetaOAuthError ? err.code : "error",
      });
      return [];
    });
    logMetaOAuthStage("businesses_fetched", { count: businesses.length });

    const accounts = await fetchMetaAdAccounts(tokens.accessToken);
    const def = ADS_INTEGRATION_DEFS.META;
    const scopes = def.defaultScopes;

    const accessEnc = encryptToken(tokens.accessToken);
    const refreshEnc = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

    if (accounts.length === 0) {
      logMetaOAuthStage("no_ad_accounts", { businesses: businesses.length });
      return platformsRedirect("no_ad_accounts");
    }

    if (accounts.length === 1) {
      try {
        await persistMetaConnection({
          restaurantId: parsed.restaurantId,
          platform,
          account: accounts[0],
          accessEnc,
          refreshEnc,
          expiresIn: tokens.expiresIn,
          scopes,
        });
        logMetaOAuthStage("database_save_ok", { mode: "single_account" });
      } catch (err) {
        const detail = err instanceof Error ? err.message : "unknown";
        logMetaOAuthStage("database_save_failed", { message: detail.slice(0, 120) });
        return platformsRedirect("database_save_failed", detail);
      }

      return NextResponse.redirect(`${redirectBase}?connected=${platformParam}&success=1`);
    }

    try {
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
          metadataJson: { pendingAccounts: accounts, businesses },
        },
        update: {
          accessTokenEnc: accessEnc,
          refreshTokenEnc: refreshEnc,
          tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
          isActive: false,
          syncStatus: "PENDING_ACCOUNT",
          metadataJson: { pendingAccounts: accounts, businesses },
          accountId: null,
          accountName: null,
          businessName: null,
        },
      });
      logMetaOAuthStage("database_save_ok", { mode: "pending_account", count: accounts.length });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown";
      logMetaOAuthStage("database_save_failed", { message: detail.slice(0, 120) });
      return platformsRedirect("database_save_failed", detail);
    }

    return NextResponse.redirect(`${redirectBase}?selectAccount=${platformParam}&success=oauth`);
  } catch (err) {
    if (err instanceof MetaOAuthError) {
      logMetaOAuthStage(err.code, {
        message: sanitizeGraphErrorMessage(err.detail || err.message) ?? null,
      });
      return platformsRedirect(err.code, err.detail);
    }

    const detail = err instanceof Error ? err.message : "unknown";
    logMetaOAuthStage("token_exchange_failed", { message: detail.slice(0, 120) });
    return platformsRedirect("token_exchange_failed", detail);
  }
}
