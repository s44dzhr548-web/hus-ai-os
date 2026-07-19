import { NextResponse } from "next/server";
import { requireAdsPlatformConnectAccess } from "@/lib/marketing/auth";
import {
  buildMetaOAuthAuthorizeUrl,
  isMetaOAuthReady,
  resolveMetaOAuthCredentials,
} from "@/lib/marketing/meta-oauth-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonUtf8(body: object, status: number) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Meta Ads OAuth — Marketing API (not WhatsApp Embedded Signup). */
export async function GET() {
  const { error, restaurantId } = await requireAdsPlatformConnectAccess();
  if (error) return error;

  const ready = await isMetaOAuthReady();
  if (!ready) {
    return jsonUtf8(
      {
        error: "Meta OAuth غير مهيأ — أضف META_APP_ID وMETA_APP_SECRET وMETA_ADS_REDIRECT_URI",
        path: "/api/integrations/meta/connect",
      },
      503
    );
  }

  const creds = resolveMetaOAuthCredentials();
  const url = await buildMetaOAuthAuthorizeUrl(restaurantId!);
  if (!url || !creds) {
    return jsonUtf8({ error: "تعذّر إنشاء رابط Facebook OAuth" }, 503);
  }

  return NextResponse.redirect(url, 307);
}
