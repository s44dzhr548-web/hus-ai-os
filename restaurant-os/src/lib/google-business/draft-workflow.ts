import prisma from "@/lib/prisma";
import type { GoogleReviewReplyStatus } from "@prisma/client";
import { generateGoogleReviewDraftReply } from "@/lib/google-business/review-draft-ai";
import { logGoogleReviewAudit } from "@/lib/google-business/reviews-service";
import { googleBusinessErrorMessage } from "@/lib/google-business/constants";

export async function getReviewForRestaurant(restaurantId: string, reviewDbId: string) {
  return prisma.googleReview.findFirst({
    where: { id: reviewDbId, restaurantId },
    include: { drafts: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
}

export async function createAiDraft(input: {
  restaurantId: string;
  reviewDbId: string;
  userId?: string | null;
}) {
  const review = await getReviewForRestaurant(input.restaurantId, input.reviewDbId);
  if (!review) {
    return { ok: false as const, code: "REVIEW_NOT_FOUND", message: googleBusinessErrorMessage("REVIEW_NOT_FOUND") };
  }

  const ai = await generateGoogleReviewDraftReply({
    restaurantId: input.restaurantId,
    reviewerName: review.reviewerName,
    starRating: review.starRating,
    comment: review.comment,
  });
  if (!ai.ok) {
    return { ok: false as const, code: "DRAFT_FAILED", message: ai.message };
  }

  const draft = await prisma.googleReviewDraft.create({
    data: {
      restaurantId: input.restaurantId,
      googleReviewDbId: review.id,
      body: ai.text,
      status: "DRAFT",
      createdByUserId: input.userId ?? null,
      updatedByUserId: input.userId ?? null,
    },
  });

  await prisma.googleReview.update({
    where: { id: review.id },
    data: {
      draftText: ai.text,
      draftByUserId: input.userId ?? null,
      replyStatus: "DRAFT",
    },
  });

  await logGoogleReviewAudit({
    restaurantId: input.restaurantId,
    googleReviewDbId: review.id,
    action: "GBP_DRAFT_AI",
    userId: input.userId,
    detailsJson: { draftId: draft.id },
  });

  return { ok: true as const, draft, text: ai.text };
}

export async function saveDraftBody(input: {
  restaurantId: string;
  reviewDbId: string;
  body: string;
  userId?: string | null;
}) {
  const text = input.body.trim();
  if (!text) {
    return { ok: false as const, code: "INVALID", message: "نص الرد مطلوب" };
  }
  const review = await getReviewForRestaurant(input.restaurantId, input.reviewDbId);
  if (!review) {
    return { ok: false as const, code: "REVIEW_NOT_FOUND", message: googleBusinessErrorMessage("REVIEW_NOT_FOUND") };
  }
  if (review.replyStatus === "PUBLISHED" && review.reviewReply) {
    return { ok: false as const, code: "INVALID", message: "الرد منشور على Google — استخدم حذف الرد أولاً" };
  }

  const draft = await prisma.googleReviewDraft.create({
    data: {
      restaurantId: input.restaurantId,
      googleReviewDbId: review.id,
      body: text,
      status: "DRAFT",
      createdByUserId: input.userId ?? null,
      updatedByUserId: input.userId ?? null,
    },
  });

  await prisma.googleReview.update({
    where: { id: review.id },
    data: {
      draftText: text,
      draftByUserId: input.userId ?? null,
      replyStatus: "DRAFT",
    },
  });

  await logGoogleReviewAudit({
    restaurantId: input.restaurantId,
    googleReviewDbId: review.id,
    action: "GBP_DRAFT_SAVE",
    userId: input.userId,
    detailsJson: { draftId: draft.id },
  });

  return { ok: true as const, draft };
}

export async function transitionDraftStatus(input: {
  restaurantId: string;
  reviewDbId: string;
  next: GoogleReviewReplyStatus;
  userId?: string | null;
  rejectReason?: string;
}) {
  const review = await getReviewForRestaurant(input.restaurantId, input.reviewDbId);
  if (!review) {
    return { ok: false as const, code: "REVIEW_NOT_FOUND", message: googleBusinessErrorMessage("REVIEW_NOT_FOUND") };
  }
  const text = review.draftText?.trim();
  if (!text && input.next !== "REJECTED") {
    return { ok: false as const, code: "INVALID", message: "لا توجد مسودة للرد" };
  }

  const data: {
    replyStatus: GoogleReviewReplyStatus;
    approvedByUserId?: string | null;
  } = { replyStatus: input.next };

  if (input.next === "APPROVED") {
    data.approvedByUserId = input.userId ?? null;
  }

  await prisma.googleReview.update({
    where: { id: review.id },
    data,
  });

  if (review.drafts[0]) {
    await prisma.googleReviewDraft.update({
      where: { id: review.drafts[0].id },
      data: { status: input.next, updatedByUserId: input.userId ?? null },
    });
  }

  await logGoogleReviewAudit({
    restaurantId: input.restaurantId,
    googleReviewDbId: review.id,
    action: `GBP_DRAFT_${input.next}`,
    userId: input.userId,
    detailsJson: input.rejectReason ? { rejectReason: input.rejectReason } : undefined,
  });

  return { ok: true as const };
}
