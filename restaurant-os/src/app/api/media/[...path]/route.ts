import { NextResponse } from "next/server";
import { PERMANENT_STORAGE_MESSAGE } from "@/lib/storage";

export const dynamic = "force-dynamic";

const DEPRECATED_MESSAGE =
  "التخزين المؤقت لم يعد مدعوماً — أعد رفع الصورة/الفيديو من لوحة المنيو";

function deprecatedResponse() {
  return NextResponse.json(
    {
      error: DEPRECATED_MESSAGE,
      permanentStorageRequired: true,
      setup: PERMANENT_STORAGE_MESSAGE,
    },
    {
      status: 410,
      headers: {
        "X-Media-Deprecated": "1",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function HEAD() {
  return deprecatedResponse();
}

export async function GET() {
  return deprecatedResponse();
}
