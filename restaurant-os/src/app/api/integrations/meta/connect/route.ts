import { NextResponse } from "next/server";
import { requireAdsPlatformConnectAccess } from "@/lib/marketing/auth";
import {
  buildMetaOAuthAuthorizeUrl,
  isMetaOAuthReady,
} from "@/lib/marketing/meta-oauth-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Meta Ads OAuth start — reads META_APP_ID, META_APP_SECRET, META_ADS_REDIRECT_URI
 * and redirects to Facebook OAuth dialog.
 */
export async function GET() {
  const { error, restaurantId } = await requireAdsPlatformConnectAccess();
  if (error) return error;

  const ready = await isMetaOAuthReady();
  if (!ready) {
    return NextResponse.json(
      {
        error: "Meta OAuth غير مهيأ — أضف META_APP_ID وMETA_APP_SECRET وMETA_ADS_REDIRECT_URI",
        path: "/api/integrations/meta/connect",
      },
      { status: 503 }
    );
  }

  const url = await buildMetaOAuthAuthorizeUrl(restaurantId!);
  if (!url) {
    return NextResponse.json(
      { error: "تعذّر إنشاء رابط Facebook OAuth" },
      { status: 503 }
    );
  }

  return NextResponse.redirect(url, 307);
}
