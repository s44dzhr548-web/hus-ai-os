import { NextRequest, NextResponse } from "next/server";
import { handleMetaAdsOAuthCallback } from "@/lib/marketing/meta-ads-callback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Meta Ads OAuth callback — saves tokens + ad account to marketing_ad_connections. */
export async function GET(req: NextRequest) {
  return handleMetaAdsOAuthCallback(req, "meta");
}
