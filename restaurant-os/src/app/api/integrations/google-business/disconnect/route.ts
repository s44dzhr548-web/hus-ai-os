import { NextResponse } from "next/server";
import { requireGbpConnectionManage } from "@/lib/google-business/auth-guards";
import { logGoogleReviewAudit } from "@/lib/google-business/reviews-service";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  const { restaurantId, session, error } = await requireGbpConnectionManage();
  if (error) return error;

  await prisma.googleBusinessConnection.update({
    where: { restaurantId: restaurantId! },
    data: {
      isActive: false,
      accessTokenEnc: null,
      refreshTokenEnc: null,
      lastSyncError: null,
    },
  });

  await logGoogleReviewAudit({
    restaurantId: restaurantId!,
    action: "GBP_DISCONNECT",
    userId: session?.user?.id,
  });

  return NextResponse.json({ ok: true, message: "تم فصل Google Business Profile" });
}
