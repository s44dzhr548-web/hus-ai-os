import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess, marketingError } from "@/lib/marketing/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const { id } = await ctx.params;
  const asset = await prisma.marketingVideoMediaAsset.findFirst({
    where: { id, restaurantId: restaurantId! },
  });
  if (!asset) return marketingError("الملف غير موجود", 404);

  try {
    const res = await fetch(asset.url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return marketingError("تعذر تحميل المعاينة", 502);
    const buffer = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return marketingError("تعذر تحميل المعاينة", 502);
  }
}
