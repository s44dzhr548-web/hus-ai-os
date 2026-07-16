import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { resolveDateRange } from "@/lib/customer-history";
import { getRestaurantBusinessDayConfig } from "@/lib/restaurant-config";
import {
  getStaffUserTimeline,
  resolveStaffActivityScope,
} from "@/lib/staff-activity-service";

export const dynamic = "force-dynamic";

const ACTIVITY_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { restaurantId, session, error } = await requireRestaurantRole(ACTIVITY_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const scope = resolveStaffActivityScope(session?.user.role, userId, session?.user.id);
  if (!scope.allowed) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const businessConfig = await getRestaurantBusinessDayConfig(restaurantId!);
  const { from, to } = resolveDateRange(
    sp.get("preset"),
    sp.get("dateFrom"),
    sp.get("dateTo"),
    businessConfig
  );

  const timeline = await getStaffUserTimeline(restaurantId!, userId, { from, to });

  return NextResponse.json({ userId, timeline });
}
