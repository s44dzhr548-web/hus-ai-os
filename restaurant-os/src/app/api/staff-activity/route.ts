import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { resolveDateRange } from "@/lib/customer-history";
import {
  canViewAllStaffActivity,
  getAuditLogRows,
  getLoginHistoryRows,
  getStaffActivitySummary,
  getStaffUserTimeline,
  resolveStaffActivityScope,
  STAFF_AUDIT_ACTIONS,
} from "@/lib/staff-activity-service";

export const dynamic = "force-dynamic";

const ACTIVITY_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION"];

export async function GET(req: NextRequest) {
  const { restaurantId, session, error } = await requireRestaurantRole(ACTIVITY_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const sp = req.nextUrl.searchParams;
  const section = sp.get("section") || "summary";
  const preset = sp.get("preset");
  const { from, to } = resolveDateRange(preset, sp.get("dateFrom"), sp.get("dateTo"));
  const requestedUserId = sp.get("userId") || undefined;
  const role = session?.user.role;
  const sessionUserId = session?.user.id;

  const scope = resolveStaffActivityScope(role, requestedUserId, sessionUserId);
  if (!scope.allowed) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  if (section === "summary") {
    return NextResponse.json({
      staff: await getStaffActivitySummary(restaurantId!, {
        from,
        to,
        scopeUserId: scope.scope === "self" ? scope.userId : requestedUserId,
      }),
      scope: scope.scope,
      canViewAll: canViewAllStaffActivity(role),
    });
  }

  if (section === "login-history") {
    return NextResponse.json({
      rows: await getLoginHistoryRows(restaurantId!, {
        from,
        to,
        userId: scope.scope === "self" ? scope.userId : requestedUserId,
      }),
    });
  }

  if (section === "audit") {
    if (!canViewAllStaffActivity(role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    return NextResponse.json({
      events: await getAuditLogRows(restaurantId!, {
        from,
        to,
        action: sp.get("action") || undefined,
        staffUserId: requestedUserId,
      }),
      actions: STAFF_AUDIT_ACTIONS,
    });
  }

  if (section === "timeline" && requestedUserId) {
    if (scope.scope === "self" && requestedUserId !== sessionUserId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    return NextResponse.json({
      timeline: await getStaffUserTimeline(restaurantId!, requestedUserId, { from, to }),
    });
  }

  return NextResponse.json({ error: "قسم غير معروف" }, { status: 400 });
}
