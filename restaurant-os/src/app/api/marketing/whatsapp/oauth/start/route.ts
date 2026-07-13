import { NextResponse } from "next/server";
import { requireWhatsAppBusinessOwnerAccess } from "@/lib/marketing/auth";
import { getWhatsAppOAuthStartUrl, whatsAppOAuthConfigured } from "@/lib/marketing/whatsapp-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireWhatsAppBusinessOwnerAccess();
  if (error) return error;

  if (!whatsAppOAuthConfigured()) {
    return NextResponse.json(
      {
        error: "Meta OAuth غير مُعد — أضف WHATSAPP_META_CLIENT_ID أو META_ADS_CLIENT_ID",
        configured: false,
      },
      { status: 503 }
    );
  }

  const url = getWhatsAppOAuthStartUrl(restaurantId!);
  if (!url) {
    return NextResponse.json({ error: "OAuth URL unavailable" }, { status: 503 });
  }

  return NextResponse.redirect(url);
}
