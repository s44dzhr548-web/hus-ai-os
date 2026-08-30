import prisma from "@/lib/prisma";
import { GbpApiError } from "@/lib/google-business/api-client";
import { getGbpAccessToken } from "@/lib/google-business/connection-service";
import { apiAccessPendingMessage, logGoogleReviewAudit } from "@/lib/google-business/reviews-service";
import { googleBusinessErrorMessage } from "@/lib/google-business/constants";

function starFromGoogle(raw: string | number | undefined): number | null {
  if (typeof raw === "number") return raw;
  if (!raw) return null;
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
    STAR_RATING_ONE: 1,
    STAR_RATING_TWO: 2,
    STAR_RATING_THREE: 3,
    STAR_RATING_FOUR: 4,
    STAR_RATING_FIVE: 5,
  };
  return map[String(raw).toUpperCase()] ?? null;
}

type GoogleReviewItem = {
  reviewId?: string;
  name?: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
};

async function fetchReviewsPage(
  accessToken: string,
  accountId: string,
  locationId: string,
  pageToken?: string
): Promise<{ reviews: GoogleReviewItem[]; nextPageToken?: string }> {
  const loc = locationId.includes("/") ? locationId.split("/").pop()! : locationId;
  const acc = accountId.replace(/^accounts\//, "");
  const url = new URL(
    `https://mybusiness.googleapis.com/v4/accounts/${acc}/locations/${loc}/reviews`
  );
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 403 || res.status === 404) {
      throw new GbpApiError("API_ACCESS_NOT_APPROVED");
    }
    throw new GbpApiError("GOOGLE_API_REQUEST_FAILED");
  }
  const data = JSON.parse(text) as { reviews?: GoogleReviewItem[]; nextPageToken?: string };
  return { reviews: data.reviews || [], nextPageToken: data.nextPageToken };
}

export async function syncGoogleReviewsForRestaurant(input: {
  restaurantId: string;
  userId?: string | null;
}): Promise<{ ok: true; imported: number } | { ok: false; code: string; message: string }> {
  const conn = await prisma.googleBusinessConnection.findUnique({
    where: { restaurantId: input.restaurantId },
    include: { locations: { where: { isSelected: true } } },
  });
  if (!conn?.isActive) {
    return { ok: false, code: "GOOGLE_ACCOUNT_NOT_CONNECTED", message: googleBusinessErrorMessage("GOOGLE_ACCOUNT_NOT_CONNECTED") };
  }
  const location = conn.locations[0];
  if (!location) {
    return { ok: false, code: "LOCATION_NOT_SELECTED", message: googleBusinessErrorMessage("LOCATION_NOT_SELECTED") };
  }
  if (!conn.accountId && !conn.accountName) {
    return { ok: false, code: "LOCATION_NOT_SELECTED", message: "اختر حساب Google Business ثم الموقع" };
  }

  const token = await getGbpAccessToken(input.restaurantId);
  if (!token) {
    return { ok: false, code: "TOKEN_EXPIRED", message: googleBusinessErrorMessage("TOKEN_EXPIRED") };
  }

  const accountId = conn.accountId || conn.accountName || "";
  let imported = 0;
  let pageToken: string | undefined;

  try {
    do {
      const page = await fetchReviewsPage(token, accountId, location.locationId, pageToken);
      for (const item of page.reviews) {
        const reviewId =
          item.reviewId ||
          (item.name ? item.name.split("/").pop() : null) ||
          item.name ||
          null;
        if (!reviewId) continue;
        const stars = starFromGoogle(item.starRating);
        const createTime = item.createTime ? new Date(item.createTime) : null;
        const updateTime = item.updateTime ? new Date(item.updateTime) : null;
        const replyText = item.reviewReply?.comment ?? null;
        const replyUpdate = item.reviewReply?.updateTime
          ? new Date(item.reviewReply.updateTime)
          : null;

        await prisma.googleReview.upsert({
          where: {
            restaurantId_reviewId: { restaurantId: input.restaurantId, reviewId },
          },
          create: {
            restaurantId: input.restaurantId,
            locationId: location.id,
            reviewId,
            reviewerName: item.reviewer?.displayName ?? null,
            reviewerPhotoUrl: item.reviewer?.profilePhotoUrl ?? null,
            starRating: stars,
            comment: item.comment ?? null,
            createTime,
            updateTime,
            reviewReply: replyText,
            googleReplyUpdateTime: replyUpdate,
            replyStatus: replyText ? "PUBLISHED" : "DRAFT",
            lastSyncAt: new Date(),
          },
          update: {
            reviewerName: item.reviewer?.displayName ?? null,
            reviewerPhotoUrl: item.reviewer?.profilePhotoUrl ?? null,
            starRating: stars,
            comment: item.comment ?? null,
            createTime,
            updateTime,
            reviewReply: replyText,
            googleReplyUpdateTime: replyUpdate,
            replyStatus: replyText ? "PUBLISHED" : undefined,
            lastSyncAt: new Date(),
          },
        });
        imported++;
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    await prisma.googleBusinessConnection.update({
      where: { id: conn.id },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });
    await logGoogleReviewAudit({
      restaurantId: input.restaurantId,
      action: "GBP_SYNC_OK",
      userId: input.userId,
      detailsJson: { imported },
    });
    return { ok: true, imported };
  } catch (e) {
    const code = e instanceof GbpApiError ? e.code : "API_ACCESS_NOT_APPROVED";
    const message =
      e instanceof GbpApiError ? e.message : apiAccessPendingMessage();
    await prisma.googleBusinessConnection.update({
      where: { id: conn.id },
      data: { lastSyncError: message },
    });
    await logGoogleReviewAudit({
      restaurantId: input.restaurantId,
      action: "GBP_SYNC_ATTEMPT",
      userId: input.userId,
      errorCode: code,
    });
    return { ok: false, code, message };
  }
}

export async function publishGoogleReviewReply(input: {
  restaurantId: string;
  reviewDbId: string;
  replyText: string;
  userId?: string | null;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const review = await prisma.googleReview.findFirst({
    where: { id: input.reviewDbId, restaurantId: input.restaurantId },
    include: { location: true },
  });
  if (!review) {
    return { ok: false, code: "REVIEW_NOT_FOUND", message: googleBusinessErrorMessage("REVIEW_NOT_FOUND") };
  }

  const conn = await prisma.googleBusinessConnection.findUnique({
    where: { restaurantId: input.restaurantId },
  });
  if (!conn?.accountId && !conn?.accountName) {
    return { ok: false, code: "GOOGLE_ACCOUNT_NOT_CONNECTED", message: googleBusinessErrorMessage("GOOGLE_ACCOUNT_NOT_CONNECTED") };
  }

  const token = await getGbpAccessToken(input.restaurantId);
  if (!token) {
    return { ok: false, code: "TOKEN_EXPIRED", message: googleBusinessErrorMessage("TOKEN_EXPIRED") };
  }

  const accountId = (conn.accountId || conn.accountName || "").replace(/^accounts\//, "");
  const loc = review.location.locationId.includes("/")
    ? review.location.locationId.split("/").pop()!
    : review.location.locationId;
  const reviewKey = review.reviewId;

  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${loc}/reviews/${reviewKey}/reply`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ comment: input.replyText }),
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) {
        return { ok: false, code: "API_ACCESS_NOT_APPROVED", message: apiAccessPendingMessage() };
      }
      return { ok: false, code: "GOOGLE_API_REQUEST_FAILED", message: googleBusinessErrorMessage("GOOGLE_API_REQUEST_FAILED") };
    }

    await prisma.googleReview.update({
      where: { id: review.id },
      data: {
        reviewReply: input.replyText,
        replyStatus: "PUBLISHED",
        publishedAt: new Date(),
        publishedByUserId: input.userId ?? null,
        googleReplyUpdateTime: new Date(),
        draftText: input.replyText,
      },
    });
    await logGoogleReviewAudit({
      restaurantId: input.restaurantId,
      googleReviewDbId: review.id,
      action: "GBP_REPLY_PUBLISHED",
      userId: input.userId,
    });
    return { ok: true };
  } catch {
    return { ok: false, code: "GOOGLE_API_REQUEST_FAILED", message: googleBusinessErrorMessage("GOOGLE_API_REQUEST_FAILED") };
  }
}

export async function deleteGoogleReviewReply(input: {
  restaurantId: string;
  reviewDbId: string;
  userId?: string | null;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const review = await prisma.googleReview.findFirst({
    where: { id: input.reviewDbId, restaurantId: input.restaurantId },
    include: { location: true },
  });
  if (!review) {
    return { ok: false, code: "REVIEW_NOT_FOUND", message: googleBusinessErrorMessage("REVIEW_NOT_FOUND") };
  }

  const conn = await prisma.googleBusinessConnection.findUnique({
    where: { restaurantId: input.restaurantId },
  });
  const token = await getGbpAccessToken(input.restaurantId);
  if (!token || !conn) {
    return { ok: false, code: "TOKEN_EXPIRED", message: googleBusinessErrorMessage("TOKEN_EXPIRED") };
  }

  const accountId = (conn.accountId || conn.accountName || "").replace(/^accounts\//, "");
  const loc = review.location.locationId.includes("/")
    ? review.location.locationId.split("/").pop()!
    : review.location.locationId;
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${loc}/reviews/${review.reviewId}/reply`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 403 || res.status === 404) {
      return { ok: false, code: "API_ACCESS_NOT_APPROVED", message: apiAccessPendingMessage() };
    }
    return { ok: false, code: "GOOGLE_API_REQUEST_FAILED", message: googleBusinessErrorMessage("GOOGLE_API_REQUEST_FAILED") };
  }

  await prisma.googleReview.update({
    where: { id: review.id },
    data: {
      reviewReply: null,
      replyStatus: "DRAFT",
      googleReplyUpdateTime: null,
    },
  });
  await logGoogleReviewAudit({
    restaurantId: input.restaurantId,
    googleReviewDbId: review.id,
    action: "GBP_REPLY_DELETED",
    userId: input.userId,
  });
  return { ok: true };
}
