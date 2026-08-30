import { NextRequest, NextResponse } from "next/server";
import {
  requireGoogleReviewsDraft,
  requireGoogleReviewsPublish,
} from "@/lib/google-business/auth-guards";
import {
  createAiDraft,
  saveDraftBody,
  transitionDraftStatus,
} from "@/lib/google-business/draft-workflow";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reviewId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { reviewId } = await ctx.params;
  const body = await req.json();
  const action = String(body.action || "save");

  if (action === "generate_ai") {
    const { restaurantId, session, error } = await requireGoogleReviewsDraft();
    if (error) return error;
    const result = await createAiDraft({
      restaurantId: restaurantId!,
      reviewDbId: reviewId,
      userId: session?.user?.id,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, text: result.text, draftId: result.draft.id });
  }

  if (action === "save") {
    const { restaurantId, session, error } = await requireGoogleReviewsDraft();
    if (error) return error;
    const result = await saveDraftBody({
      restaurantId: restaurantId!,
      reviewDbId: reviewId,
      body: String(body.body || ""),
      userId: session?.user?.id,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, draft: result.draft });
  }

  if (action === "submit") {
    const { restaurantId, session, error } = await requireGoogleReviewsDraft();
    if (error) return error;
    const result = await transitionDraftStatus({
      restaurantId: restaurantId!,
      reviewDbId: reviewId,
      next: "PENDING_APPROVAL",
      userId: session?.user?.id,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, replyStatus: "PENDING_APPROVAL" });
  }

  if (action === "approve") {
    const { restaurantId, session, error } = await requireGoogleReviewsPublish();
    if (error) return error;
    const result = await transitionDraftStatus({
      restaurantId: restaurantId!,
      reviewDbId: reviewId,
      next: "APPROVED",
      userId: session?.user?.id,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, replyStatus: "APPROVED" });
  }

  if (action === "reject") {
    const { restaurantId, session, error } = await requireGoogleReviewsPublish();
    if (error) return error;
    const result = await transitionDraftStatus({
      restaurantId: restaurantId!,
      reviewDbId: reviewId,
      next: "REJECTED",
      userId: session?.user?.id,
      rejectReason: body.reason ? String(body.reason) : undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, replyStatus: "REJECTED" });
  }

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
