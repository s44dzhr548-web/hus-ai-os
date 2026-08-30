import { NextRequest, NextResponse } from "next/server";

import { requireAdsPlatformConnectAccess } from "@/lib/marketing/auth";

import {

  googleMarketingPlatformsUrl,

  logGoogleOAuthRequestDomain,

  resolvePublicHostname,

  shouldRedirectGoogleOAuthFromVercelAppHost,

} from "@/lib/canonical-app-url";

import {

  buildGoogleOAuthAuthorizeUrl,

  GOOGLE_OAUTH_LINK_COOKIE,

  listMissingGoogleOAuthEnv,

  newGoogleOAuthLinkNonce,

  resolveGoogleOAuthCredentials,

} from "@/lib/marketing/google-ads-oauth-service";

import { createGoogleOAuthStateRecord } from "@/lib/marketing/google-oauth-state-store";



export const dynamic = "force-dynamic";

export const runtime = "nodejs";



function jsonUtf8(body: object, status: number) {

  return new NextResponse(JSON.stringify(body), {

    status,

    headers: { "Content-Type": "application/json; charset=utf-8" },

  });

}



function attachGoogleOAuthCookie(res: NextResponse, publicHost: string) {

  if (!publicHost.endsWith("menuhus.com")) return res;

  res.cookies.set(GOOGLE_OAUTH_LINK_COOKIE, newGoogleOAuthLinkNonce(), {

    httpOnly: true,

    secure: true,

    sameSite: "lax",

    path: "/",

    domain: ".menuhus.com",

    maxAge: 20 * 60,

  });

  return res;

}



/** Google Ads OAuth — block only when public host is *.vercel.app (not internal deployment URL). */

export async function GET(req: NextRequest) {

  logGoogleOAuthRequestDomain(req);

  const { publicHost } = resolvePublicHostname(req);



  if (shouldRedirectGoogleOAuthFromVercelAppHost(req)) {

    return NextResponse.redirect(

      googleMarketingPlatformsUrl({

        error: "use_menuhus_domain",

        platform: "google",

      })

    );

  }



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



  const { stateKey } = await createGoogleOAuthStateRecord(userId, restaurantId!);

  const url = buildGoogleOAuthAuthorizeUrl(stateKey);

  if (!url || !resolveGoogleOAuthCredentials()) {

    return jsonUtf8({ error: "تعذّر إنشاء رابط Google OAuth" }, 503);

  }



  if (url.includes("ads.google.com")) {

    return jsonUtf8({ error: "مسار OAuth غير صالح" }, 500);

  }



  const res = NextResponse.redirect(url, 307);

  return attachGoogleOAuthCookie(res, publicHost);

}


