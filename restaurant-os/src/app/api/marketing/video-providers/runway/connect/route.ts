import { NextRequest, NextResponse } from "next/server";
import { requireMarketingOwnerAccess, marketingError } from "@/lib/marketing/auth";
import { canEncryptTokens, integrationEncryptionEnvHint } from "@/lib/marketing/encryption";
import { connectRunwayVideoProvider } from "@/lib/marketing/providers/connection-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error, restaurantId, session, canManageSecrets } = await requireMarketingOwnerAccess();
  if (error) return error;
  if (!canManageSecrets) {
    return marketingError("صلاحية المالك أو مدير المطعم مطلوبة لحفظ المفاتيح", 403);
  }

  if (!canEncryptTokens()) {
    return NextResponse.json(
      {
        ok: false,
        error: `مفتاح التشفير غير مضاف في Vercel — ${integrationEncryptionEnvHint()}`,
        encryptionConfigured: false,
      },
      { status: 503 }
    );
  }

  let body: { apiKey?: string; usageType?: string };
  try {
    body = await req.json();
  } catch {
    return marketingError("طلب غير صالح", 400);
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const usageType = typeof body.usageType === "string" ? body.usageType.trim() : "";

  if (!apiKey || !usageType) {
    return NextResponse.json(
      { ok: false, error: "الحقول المطلوبة ناقصة", code: "missing_fields" },
      { status: 400 }
    );
  }

  try {
    const result = await connectRunwayVideoProvider(restaurantId!, session!.user.id, {
      apiKey,
      usageType,
    });
    return NextResponse.json({
      ok: true,
      status: result.status,
      lastTestedAt: result.lastTestedAt,
      encryptionConfigured: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل الربط";
    const isInvalid =
      message.includes("غير صالح") ||
      message.includes("Invalid") ||
      message.includes("401") ||
      message.includes("403");
    return NextResponse.json(
      {
        ok: false,
        error: message,
        code: isInvalid ? "invalid_key" : "connect_failed",
      },
      { status: isInvalid ? 401 : 400 }
    );
  }
}
