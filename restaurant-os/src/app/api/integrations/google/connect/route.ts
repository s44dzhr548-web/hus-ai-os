import { NextResponse } from "next/server";
import { requireAdsPlatformConnectAccess } from "@/lib/marketing/auth";
import {
  buildGoogleOAuthAuthorizeUrl,
  listMissingGoogleOAuthEnv,
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
  const { error, restaurantId, session } = await requireAdsPlatformConnectAccess();
  if (error) return error;

  const missingEnv = listMissingGoogleOAuthEnv();
  if (missingEnv.length > 0) {
    return jsonUtf8(
      {
        error: `إعداد Google OAuth ناقص — أضف: ${missingEnv.join("، ")}`,
        ready: false,
        missingEnv,
      },
      503
    );
  }

  const userId = session?.user?.id;
  if (!userId) {
    return jsonUtf8({ error: "جلسة غير صالحة" }, 401);
  }

  const url = buildGoogleOAuthAuthorizeUrl(restaurantId!, userId);
  if (!url || !resolveGoogleOAuthCredentials()) {
    return jsonUtf8({ error: "تعذّر إنشاء رابط Google OAuth" }, 503);
  }

  if (url.includes("ads.google.com")) {
    return jsonUtf8({ error: "مسار OAuth غير صالح" }, 500);
  }

  return NextResponse.redirect(url, 307);
}
