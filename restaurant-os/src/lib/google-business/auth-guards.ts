import { NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import type { Session } from "next-auth";
import {
  canDraftGoogleReview,
  canManageGbpConnection,
  canPublishGoogleReview,
} from "@/lib/google-business/permissions";

const GBP_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "MARKETING"] as const;

export async function requireGoogleReviewsRead() {
  return requireRestaurantRole([...GBP_READ_ROLES]);
}

export async function requireGoogleReviewsPublish() {
  const ctx = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER"]);
  if (ctx.error) return ctx;
  if (!canPublishGoogleReview(ctx.session as Session | null)) {
    return {
      ...ctx,
      error: NextResponse.json(
        { error: "ليس لديك صلاحية اعتماد أو نشر الرد على Google" },
        { status: 403 }
      ),
    };
  }
  return ctx;
}

export async function requireGoogleReviewsDraft() {
  const ctx = await requireGoogleReviewsRead();
  if (ctx.error) return ctx;
  if (!canDraftGoogleReview(ctx.session as Session | null)) {
    return {
      ...ctx,
      error: NextResponse.json(
        { error: "ليس لديك صلاحية إنشاء أو تعديل مسودة الرد" },
        { status: 403 }
      ),
    };
  }
  return ctx;
}

export async function requireGbpConnectionManage() {
  const ctx = await requireRestaurantRole(["OWNER", "ADMIN", "MANAGER", "MARKETING"]);
  if (ctx.error) return ctx;
  if (!canManageGbpConnection(ctx.session as Session | null)) {
    return {
      ...ctx,
      error: NextResponse.json({ error: "ليس لديك صلاحية ربط Google Business Profile" }, { status: 403 }),
    };
  }
  return ctx;
}
