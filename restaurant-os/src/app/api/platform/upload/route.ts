import { NextResponse } from "next/server";
import { uploadMedia, isR2Configured, PERMANENT_STORAGE_MESSAGE } from "@/lib/storage";
import { requirePlatformAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  if (!isR2Configured()) {
    return NextResponse.json({ error: PERMANENT_STORAGE_MESSAGE }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const restaurantId = formData.get("restaurantId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم رفع ملف" }, { status: 400 });
    }

    if (!IMAGE_TYPES.has(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE) {
      return NextResponse.json({ error: "الحد الأقصى 5 ميجابايت" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const prefix = restaurantId || "platform";
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const result = await uploadMedia(buffer, filename, file.type);
    return NextResponse.json({ url: result.url, key: result.key });
  } catch (err) {
    console.error("[platform upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "فشل الرفع" },
      { status: 500 }
    );
  }
}
