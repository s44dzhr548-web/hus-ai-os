import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { toCsv, resolveDateRange } from "@/lib/customer-history";
import {
  canViewAllStaffActivity,
  getAuditLogRows,
  getLoginHistoryRows,
  getStaffActivitySummary,
  getStaffUserTimeline,
  resolveStaffActivityScope,
} from "@/lib/staff-activity-service";

export const dynamic = "force-dynamic";

const EXPORT_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION"];

export async function GET(req: NextRequest) {
  const { restaurantId, session, error } = await requireRestaurantRole(EXPORT_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") || "summary";
  const format = sp.get("format") || "csv";
  const { from, to } = resolveDateRange(sp.get("preset"), sp.get("dateFrom"), sp.get("dateTo"));
  const userId = sp.get("userId") || undefined;
  const role = session?.user.role;

  const scope = resolveStaffActivityScope(role, userId, session?.user.id);
  if (!scope.allowed) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let filename = "staff-activity.csv";
  let content = "";

  if (type === "summary") {
    const rows = await getStaffActivitySummary(restaurantId!, {
      from,
      to,
      scopeUserId: scope.scope === "self" ? scope.userId : userId,
    });
    const headers = [
      "name",
      "email",
      "role",
      "customersRegistered",
      "tablesAssigned",
      "sessionsStarted",
      "sessionsClosed",
      "reservationsCreated",
      "editsPerformed",
      "totalGuests",
      "avgSessionDurationDisplay",
      "firstActivityDisplay",
      "lastActivityDisplay",
    ];
    content = toCsv(
      headers,
      rows.map((r) => ({ ...r }) as Record<string, unknown>)
    );
    filename = "staff-activity-summary.csv";
  } else if (type === "login-history") {
    const rows = await getLoginHistoryRows(restaurantId!, {
      from,
      to,
      userId: scope.scope === "self" ? scope.userId : userId,
    });
    const headers = [
      "userName",
      "loginDate",
      "loginTime",
      "logoutDate",
      "logoutTime",
      "sessionDurationDisplay",
      "device",
      "browser",
      "ipAddress",
      "loginSuccess",
      "failureReason",
      "endReason",
    ];
    content = toCsv(headers, rows as Record<string, unknown>[]);
    filename = "login-history.csv";
  } else if (type === "audit") {
    if (!canViewAllStaffActivity(role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const events = await getAuditLogRows(restaurantId!, { from, to, staffUserId: userId });
    const headers = [
      "date",
      "time",
      "actionLabel",
      "staffName",
      "previousValue",
      "newValue",
      "result",
      "ipAddress",
    ];
    content = toCsv(headers, events as Record<string, unknown>[]);
    filename = "audit-log.csv";
  } else if (type === "timeline" && userId) {
    const timeline = await getStaffUserTimeline(restaurantId!, userId, { from, to });
    const headers = [
      "date",
      "time",
      "actionLabel",
      "customerName",
      "table",
      "previousValue",
      "newValue",
      "result",
    ];
    content = toCsv(headers, timeline as Record<string, unknown>[]);
    filename = `staff-timeline-${userId}.csv`;
  } else {
    return NextResponse.json({ error: "نوع تصدير غير مدعوم" }, { status: 400 });
  }

  if (format === "pdf") {
    const pdfBody = `Staff Activity Export\n\n${content.replace(/\uFEFF/g, "")}`;
    return new NextResponse(pdfBody, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename.replace(".csv", ".pdf")}"`,
      },
    });
  }

  if (format === "xlsx" || format === "excel") {
    return new NextResponse(content, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename.replace(".csv", ".xls")}"`,
      },
    });
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
