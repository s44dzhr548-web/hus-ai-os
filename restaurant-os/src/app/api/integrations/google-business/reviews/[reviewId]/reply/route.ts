import { NextRequest, NextResponse } from "next/server";
import { requireGoogleReviewsPublish } from "@/lib/google-business/auth-guards";
import { getReviewForRestaurant } from "@/lib/google-business/draft-workflow";
import { publishGoogleReviewReply } from "@/lib/google-business/sync-reviews";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reviewId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { restaurantId, session, error } = await requireGoogleReviewsPublish();
  if (error) return error;

  const { reviewId } = await ctx.params;
  const body = await req.json();
  const review = await getReviewForRestaurant(restaurantId!, reviewId);
  if (!review) {
    return NextResponse.json({ error: "المراجعة غير موجودة" }, { status: 404 });
  }

  const text = String(body.body || review.draftText || "").trim();
  if (!text) {
    return NextResponse.json({ error: "لا يوجد نص للنشر" }, { status: 400 });
  }
  if (review.replyStatus !== "APPROVED" && review.replyStatus !== "PENDING_APPROVAL") {
    const force = body.force === true && review.replyStatus === "DRAFT";
    if (!force) {
      return NextResponse.json(
        { error: "يجب اعتماد المسودة قبل النشر على Google" },
        { status: 400 }
      );
    }
  }

  const result = await publishGoogleReviewReply({
    restaurantId: restaurantId!,
    reviewDbId: reviewId,
    replyText: text,
    userId: session?.user?.id,
  });

  if (!result.ok) {
    await prisma.googleReview.update({
      where: { id: review.id },
      data: { replyStatus: "FAILED" },
    });
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: "تم طلب نشر الرد — يُنشر فقط عند نجاح Google API" });
}
