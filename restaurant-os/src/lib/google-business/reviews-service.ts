import prisma from "@/lib/prisma";
import { googleBusinessErrorMessage } from "@/lib/google-business/constants";

export type GoogleReviewListFilters = {
  stars?: number;
  replyStatus?: string;
  q?: string;
  from?: Date;
  to?: Date;
  hasReply?: boolean;
  noReply?: boolean;
};

export async function listGoogleReviews(restaurantId: string, filters: GoogleReviewListFilters) {
  const where: Record<string, unknown> = { restaurantId };
  if (filters.stars) where.starRating = filters.stars;
  if (filters.replyStatus) where.replyStatus = filters.replyStatus;
  if (filters.hasReply) where.reviewReply = { not: null };
  if (filters.noReply) where.reviewReply = null;
  if (filters.from || filters.to) {
    where.createTime = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  if (filters.q?.trim()) {
    where.OR = [
      { reviewerName: { contains: filters.q.trim(), mode: "insensitive" } },
      { comment: { contains: filters.q.trim(), mode: "insensitive" } },
    ];
  }

  return prisma.googleReview.findMany({
    where: where as never,
    orderBy: { createTime: "desc" },
    take: 200,
  });
}

export async function logGoogleReviewAudit(input: {
  restaurantId: string;
  googleReviewDbId?: string | null;
  action: string;
  userId?: string | null;
  detailsJson?: Record<string, unknown>;
  errorCode?: string | null;
}) {
  await prisma.googleReviewAuditLog.create({
    data: {
      restaurantId: input.restaurantId,
      googleReviewDbId: input.googleReviewDbId ?? null,
      action: input.action,
      userId: input.userId ?? null,
      detailsJson: input.detailsJson as never,
      errorCode: input.errorCode ?? null,
    },
  });
}

export function apiAccessPendingMessage(): string {
  return googleBusinessErrorMessage("API_ACCESS_NOT_APPROVED");
}
