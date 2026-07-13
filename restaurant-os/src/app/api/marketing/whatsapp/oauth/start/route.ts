import { NextResponse } from "next/server";
import { requireWhatsAppBusinessOwnerAccess } from "@/lib/marketing/auth";
import { getWhatsAppOAuthStartUrl, whatsAppOAuthConfigured } from "@/lib/marketing/whatsapp-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireWhatsAppBusinessOwnerAccess();
  if (error) return error;

  if (!(await whatsAppOAuthConfigured())) {
    return NextResponse.json(
      {
        error: "خدمة الربط مع Meta غير مفعّلة بعد — تواصل مع مسؤول المنصة",
        oauthReady: false,
      },
      { status: 503 }
    );
  }

  const url = await getWhatsAppOAuthStartUrl(restaurantId!);
  if (!url) {
    return NextResponse.json(
      { error: "تعذّر بدء تسجيل الدخول — راجع إعدادات المنصة", oauthReady: false },
      { status: 503 }
    );
  }

  return NextResponse.redirect(url);
}
