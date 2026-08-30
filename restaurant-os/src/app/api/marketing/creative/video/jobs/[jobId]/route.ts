import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess, marketingError } from "@/lib/marketing/auth";
import { refreshVideoJobStatus } from "@/lib/marketing/video-studio-service";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  try {
    let resolvedId = jobId;
    const byExternal = await prisma.marketingVideoJob.findFirst({
      where: { restaurantId: restaurantId!, externalTaskId: jobId },
      select: { id: true },
    });
    if (byExternal) resolvedId = byExternal.id;

    const job = await refreshVideoJobStatus(restaurantId!, resolvedId);
    return NextResponse.json(job);
  } catch (e) {
    return marketingError(e instanceof Error ? e.message : "فشل جلب الحالة", 404);
  }
}
