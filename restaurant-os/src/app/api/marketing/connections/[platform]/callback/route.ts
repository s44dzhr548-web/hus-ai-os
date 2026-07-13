import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import { parseOAuthState, OAUTH_CONFIG } from "@/lib/marketing/oauth";
import { logMarketingAudit } from "@/lib/marketing/security";
import type { MarketingPlatform } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform: platformParam } = await params;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectOk = `${base}/dashboard/marketing/connections?connected=${platformParam}`;

  if (!code || !state) {
    return NextResponse.redirect(`${base}/dashboard/marketing/connections?error=oauth_denied`);
  }

  const parsed = parseOAuthState(state);
  if (!parsed) {
    return NextResponse.redirect(`${base}/dashboard/marketing/connections?error=invalid_state`);
  }

  const platform = platformParam.toUpperCase() as MarketingPlatform;
  const cfg = OAUTH_CONFIG[platform];
  if (!cfg || !canEncryptTokens()) {
    return NextResponse.redirect(`${base}/dashboard/marketing/connections?error=not_configured`);
  }

  const clientId = process.env[cfg.clientIdEnv];
  const clientSecret = process.env[cfg.clientSecretEnv];
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${base}/dashboard/marketing/connections?error=missing_credentials`);
  }

  const redirectUri = `${base}/api/marketing/connections/${platformParam}/callback`;
  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/dashboard/marketing/connections?error=token_exchange`);
  }

  const tokens = await tokenRes.json();
  const accessEnc = tokens.access_token ? encryptToken(tokens.access_token) : null;
  const refreshEnc = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

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
      tokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      scopes: cfg.scopes,
      isActive: true,
      connectedAt: new Date(),
    },
    update: {
      accessTokenEnc: accessEnc,
      refreshTokenEnc: refreshEnc,
      tokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      isActive: true,
      connectedAt: new Date(),
    },
  });

  await logMarketingAudit({
    restaurantId: parsed.restaurantId,
    action: "OAUTH_CONNECT",
    entityType: "MarketingAdConnection",
    details: { platform },
  });

  return NextResponse.redirect(redirectOk);
}
