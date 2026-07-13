import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { getSegmentCounts, getSegmentCustomers } from "@/lib/marketing/segments";
import type { MarketingSegment } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const segment = req.nextUrl.searchParams.get("segment") as MarketingSegment | null;

  if (segment) {
    const customers = await getSegmentCustomers(restaurantId!, segment);
    return NextResponse.json({ segment, customers });
  }

  const counts = await getSegmentCounts(restaurantId!);
  return NextResponse.json({ counts });
}
