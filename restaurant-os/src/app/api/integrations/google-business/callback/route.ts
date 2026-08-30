import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { canEncryptTokens, encryptToken } from "@/lib/marketing/encryption";
import { gbpRedirectUri } from "@/lib/google-business/constants";
import { googleBusinessReviewsUrl } from "@/lib/google-business/oauth-config";
import { logGoogleReviewAudit } from "@/lib/google-business/reviews-service";
import {
  logGoogleOAuthRequestDomain,
  shouldRedirectGoogleOAuthFromVercelAppHost,
} from "@/lib/canonical-app-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function failRedirect(reason: string, detail?: string) {
  return NextResponse.redirect(
    googleBusinessReviewsUrl({
      error: "oauth_failed",
      reason,
      ...(detail ? { detail } : {}),
    })
  );
}

export async function GET(req: NextRequest) {
  logGoogleOAuthRequestDomain(req);

  const url = req.nextUrl;

  if (shouldRedirectGoogleOAuthFromVercelAppHost(req)) {
    const forward = new URL(gbpRedirectUri());
    url.searchParams.forEach((value, key) => {
      forward.searchParams.set(key, value);
    });
    return NextResponse.redirect(forward.toString());
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    return NextResponse.redirect(
      googleBusinessReviewsUrl({ error: "oauth_denied", reason: err })
    );
  }
  if (!code || !state) {
    return failRedirect("missing_code_or_state");
  }

  const stateRow = await prisma.googleAdsOAuthState.findFirst({
    where: { stateKey: `gbp:${state}`, expiresAt: { gt: new Date() } },
  });
  if (!stateRow?.restaurantId || !stateRow.userId) {
    return NextResponse.redirect(
      googleBusinessReviewsUrl({ error: "state_mismatch" })
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return failRedirect("session_required");
  }
  if (session.user.id !== stateRow.userId) {
    return failRedirect("session_user_mismatch");
  }

  if (!canEncryptTokens()) {
    return failRedirect("encryption_not_configured");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return failRedirect("oauth_env_missing");
  }

  const redirectUri = gbpRedirectUri();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokens.access_token) {
    console.warn(
      JSON.stringify({
        event: "gbp_oauth_token_exchange_failed",
        status: tokenRes.status,
        googleError: tokens.error ?? null,
        redirectUriHost: new URL(redirectUri).host,
      })
    );
    return failRedirect("token_exchange_failed", tokens.error ?? undefined);
  }

  const restaurantExists = await prisma.restaurant.findUnique({
    where: { id: stateRow.restaurantId },
    select: { id: true },
  });
  if (!restaurantExists) {
    return failRedirect("restaurant_not_found");
  }

  try {
    const existing = await prisma.googleBusinessConnection.findUnique({
      where: { restaurantId: stateRow.restaurantId },
    });

    const refreshEnc =
      tokens.refresh_token != null
        ? encryptToken(tokens.refresh_token)
        : existing?.refreshTokenEnc ?? null;

    if (!refreshEnc && !existing?.refreshTokenEnc) {
      return failRedirect("missing_refresh_token");
    }

    const saved = await prisma.googleBusinessConnection.upsert({
      where: { restaurantId: stateRow.restaurantId },
      create: {
        restaurantId: stateRow.restaurantId,
        accessTokenEnc: encryptToken(tokens.access_token),
        refreshTokenEnc: refreshEnc!,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        isActive: true,
        connectedAt: new Date(),
        connectedByUserId: stateRow.userId,
        scopes: ["https://www.googleapis.com/auth/business.manage"],
        lastSyncError: null,
      },
      update: {
        accessTokenEnc: encryptToken(tokens.access_token),
        ...(tokens.refresh_token ? { refreshTokenEnc: refreshEnc! } : {}),
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined,
        isActive: true,
        connectedAt: new Date(),
        connectedByUserId: stateRow.userId,
        lastSyncError: null,
      },
    });

    if (!saved.isActive || !saved.accessTokenEnc) {
      return failRedirect("database_save_failed");
    }

    await prisma.googleAdsOAuthState.deleteMany({ where: { id: stateRow.id } });

    await logGoogleReviewAudit({
      restaurantId: stateRow.restaurantId,
      action: "GBP_OAUTH_CONNECT",
      userId: stateRow.userId,
    });

    console.info(
      JSON.stringify({
        event: "gbp_oauth_connect_ok",
        restaurantId: stateRow.restaurantId,
        connectionId: saved.id,
        redirectUriHost: new URL(redirectUri).host,
      })
    );

    return NextResponse.redirect(googleBusinessReviewsUrl({ connected: "1" }));
  } catch (e) {
    console.error(
      JSON.stringify({
        event: "gbp_oauth_save_error",
        restaurantId: stateRow.restaurantId,
        message: e instanceof Error ? e.message : "unknown",
      })
    );
    return failRedirect("database_save_failed");
  }
}
