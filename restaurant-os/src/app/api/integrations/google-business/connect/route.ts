import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { requireRestaurantRole, restaurantIdFromRequest } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { GBP_OAUTH_SCOPE, gbpRedirectUri } from "@/lib/google-business/constants";
import {
  googleBusinessConnectUrl,
  googleBusinessReviewsUrl,
  listMissingGbpOAuthEnv,
} from "@/lib/google-business/oauth-config";
import {
  logGoogleOAuthRequestDomain,
  shouldRedirectGoogleOAuthFromVercelAppHost,
} from "@/lib/canonical-app-url";
import { ACTIVE_RESTAURANT_COOKIE } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  logGoogleOAuthRequestDomain(req);

  if (shouldRedirectGoogleOAuthFromVercelAppHost(req)) {
    const rid = restaurantIdFromRequest(req);
    return NextResponse.redirect(
      googleBusinessConnectUrl(rid ? { restaurantId: rid } : undefined)
    );
  }

  const requestedRestaurantId = restaurantIdFromRequest(req);
  const { restaurantId, session, error, isPlatformAdmin } = await requireRestaurantRole(
    ["OWNER", "ADMIN", "MANAGER", "MARKETING"],
    requestedRestaurantId
  );
  if (error) return error;

  if (isPlatformAdmin) {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value;
    if (!requestedRestaurantId && !fromCookie) {
      return NextResponse.redirect(
        googleBusinessReviewsUrl({
          error: "select_restaurant",
          detail: "platform_admin",
        })
      );
    }
  }

  const missingEnv = listMissingGbpOAuthEnv();
  if (missingEnv.length > 0) {
    return NextResponse.json(
      { error: "إعداد Google Business Profile ناقص", missingEnv },
      { status: 503 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const state = randomBytes(24).toString("hex");

  await prisma.googleAdsOAuthState.create({
    data: {
      stateKey: `gbp:${state}`,
      userId: session!.user.id,
      restaurantId: restaurantId!,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const redirectUri = gbpRedirectUri();
  console.info(
    JSON.stringify({
      event: "gbp_oauth_connect_start",
      restaurantId: restaurantId!,
      userId: session!.user.id,
      redirectUriHost: new URL(redirectUri).host,
      ts: new Date().toISOString(),
    })
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GBP_OAUTH_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
