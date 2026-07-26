import { NextResponse } from "next/server";
import { requireAdsPlatformConnectAccess } from "@/lib/marketing/auth";
import {
  buildGoogleOAuthAuthorizeUrl,
  isGoogleOAuthReady,
  resolveGoogleOAuthCredentials,
} from "@/lib/marketing/google-ads-oauth-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonUtf8(body: object, status: number) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Google Ads OAuth — server-side authorize redirect (not ads.google.com console URLs). */
export async function GET() {
  const { error, restaurantId } = await requireAdsPlatformConnectAccess();
  if (error) return error;

  if (!isGoogleOAuthReady()) {
    const creds = resolveGoogleOAuthCredentials();
    return jsonUtf8(
      {
        error: "Google OAuth غير مهيأ — أضف GOOGLE_CLIENT_ID وGOOGLE_CLIENT_SECRET وGOOGLE_REDIRECT_URI",
        ready: false,
        hasClientId: Boolean(creds?.clientId),
      },
      503
    );
  }

  const url = buildGoogleOAuthAuthorizeUrl(restaurantId!);
  if (!url) {
    return jsonUtf8({ error: "تعذّر إنشاء رابط Google OAuth" }, 503);
  }

  return NextResponse.redirect(url, 307);
}
