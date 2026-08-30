import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import {
  googleMarketingPlatformsUrl,
  logGoogleOAuthRequestDomain,
  shouldRedirectGoogleOAuthFromVercelAppHost,
} from "@/lib/canonical-app-url";
import {
  exchangeGoogleOAuthCode,
  fetchGoogleAuthorizedProfile,
  getGoogleAdsManagerCustomerId,
  googleOAuthFailureReasonFromGoogleError,
  googleOAuthPostConnectMessage,
  logGoogleOAuthTokenExchangeError,
} from "@/lib/marketing/google-ads-oauth-service";
import {
  consumeGoogleOAuthStateRecord,
  logGoogleOAuthFailure,
} from "@/lib/marketing/google-oauth-state-store";
import { logMarketingAudit } from "@/lib/marketing/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function failRedirect(reason: string) {
  return NextResponse.redirect(
    googleMarketingPlatformsUrl({
      error: "oauth_failed",
      platform: "google",
      reason,
    })
  );
}

export async function GET(req: NextRequest) {
  logGoogleOAuthRequestDomain(req);
  if (shouldRedirectGoogleOAuthFromVercelAppHost(req)) {
    return NextResponse.redirect(
      googleMarketingPlatformsUrl({
        error: "use_menuhus_domain",
        platform: "google",
      })
    );
  }

  const err = req.nextUrl.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(
      googleMarketingPlatformsUrl({ error: "oauth_denied", platform: "google" })
    );
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) {
    logGoogleOAuthFailure("state_missing");
    return failRedirect("state_missing");
  }

  const consumed = await consumeGoogleOAuthStateRecord(state);
  if (!consumed.ok) {
    const reason = consumed.reason === "state_expired" ? "state_mismatch" : consumed.reason;
    logGoogleOAuthFailure(reason);
    return failRedirect(reason);
  }

  if (!canEncryptTokens()) {
    logGoogleOAuthFailure("encryption_not_configured");
    return NextResponse.redirect(
      googleMarketingPlatformsUrl({ error: "not_configured", platform: "google" })
    );
  }

  let tokens;
  const exchange = await exchangeGoogleOAuthCode(code);
  if (!exchange.ok) {
    logGoogleOAuthTokenExchangeError(exchange);
    logGoogleOAuthFailure("token_exchange_failed", { googleError: exchange.error });
    const reason = googleOAuthFailureReasonFromGoogleError(exchange.error);
    return failRedirect(reason);
  }
  tokens = exchange;

  try {
    const profile = await fetchGoogleAuthorizedProfile(tokens.accessToken);
    const managerCustomerId = getGoogleAdsManagerCustomerId();
    const { restaurantId, userId } = consumed;

    const existing = await prisma.marketingAdConnection.findUnique({
      where: {
        restaurantId_platform: {
          restaurantId,
          platform: "GOOGLE",
        },
      },
    });

    const accessEnc = encryptToken(tokens.accessToken);
    const refreshEnc = tokens.refreshToken
      ? encryptToken(tokens.refreshToken)
      : existing?.refreshTokenEnc ?? null;

    const pendingDevToken = googleOAuthPostConnectMessage();
    const accountLabel = profile.email || profile.name || null;
    const accountId =
      managerCustomerId && !managerCustomerId.toLowerCase().includes("oauth")
        ? managerCustomerId.replace(/-/g, "")
        : null;

    await prisma.marketingAdConnection.upsert({
      where: {
        restaurantId_platform: {
          restaurantId,
          platform: "GOOGLE",
        },
      },
      create: {
        restaurantId,
        platform: "GOOGLE",
        accessTokenEnc: accessEnc,
        refreshTokenEnc: refreshEnc,
        tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        scopes: ["https://www.googleapis.com/auth/adwords"],
        isActive: true,
        connectedAt: new Date(),
        connectedByUserId: userId,
        accountId,
        accountName: accountLabel,
        businessName: profile.name,
        syncStatus: pendingDevToken ? "CONNECTED_PENDING_DEV_TOKEN" : "CONNECTED",
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
        connectedByUserId: userId,
        ...(accountId ? { accountId } : {}),
        ...(accountLabel
          ? { accountName: accountLabel, businessName: profile.name ?? existing?.businessName }
          : {}),
        syncStatus: pendingDevToken ? "CONNECTED_PENDING_DEV_TOKEN" : "CONNECTED",
        metadataJson: {
          authorizedEmail: profile.email,
          managerCustomerId: managerCustomerId ?? undefined,
        },
      },
    });

    await logMarketingAudit({
      restaurantId,
      userId,
      action: "OAUTH_CONNECT",
      entityType: "MarketingAdConnection",
      details: {
        platform: "GOOGLE",
        pendingDeveloperToken: Boolean(pendingDevToken),
        hasRefreshToken: Boolean(refreshEnc),
      },
    });

    const params: Record<string, string> = {
      connected: "google",
      success: "1",
    };
    if (pendingDevToken) params.google_campaigns = "pending_dev_token";

    return NextResponse.redirect(googleMarketingPlatformsUrl(params));
  } catch {
    logGoogleOAuthFailure("database_save_failed");
    return failRedirect("database_save_failed");
  }
}
