import { NextResponse } from "next/server";
import { requireGoogleReviewsPublish } from "@/lib/google-business/auth-guards";
import { deleteGoogleReviewReply } from "@/lib/google-business/sync-reviews";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reviewId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { restaurantId, session, error } = await requireGoogleReviewsPublish();
  if (error) return error;

  const { reviewId } = await ctx.params;
  const result = await deleteGoogleReviewReply({
    restaurantId: restaurantId!,
    reviewDbId: reviewId,
    userId: session?.user?.id,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
