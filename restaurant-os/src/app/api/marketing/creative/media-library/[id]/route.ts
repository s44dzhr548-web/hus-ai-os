import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess, marketingError } from "@/lib/marketing/auth";
import { deleteMediaAsset, setPrimaryAsset } from "@/lib/marketing/video-media-library";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  const { id } = await ctx.params;
  try {
    await deleteMediaAsset(restaurantId!, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل الحذف" },
      { status: 400 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;
  const { id } = await ctx.params;
  let body: { isPrimary?: boolean };
  try {
    body = await req.json();
  } catch {
    return marketingError("طلب غير صالح", 400);
  }
  if (body.isPrimary) {
    try {
      await setPrimaryAsset(restaurantId!, id);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "فشل التحديث" },
        { status: 400 }
      );
    }
  }
  return marketingError("لا يوجد تحديث", 400);
}
