import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { MONITORING_OWNER_ROLES } from "@/lib/monitoring/types";
import {
  auditFeedCsv,
  liveCustomersCsv,
  monitoringPdfHtml,
  monitoringStatsCsv,
  staffPerformanceCsv,
} from "@/lib/monitoring/export";
import {
  getImmutableAuditFeed,
  getLiveCustomers,
  getMonitoringStats,
  getStaffPerformance,
} from "@/lib/monitoring/service";
import { getStaffLoginHistory } from "@/lib/staff-activity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole([...MONITORING_OWNER_ROLES]);
  if (error) return error;

  const type = req.nextUrl.searchParams.get("type") || "stats";
  const format = req.nextUrl.searchParams.get("format") || "csv";
  const branchId = req.nextUrl.searchParams.get("branchId") || undefined;

  let content = "";
  let filename = "monitoring";
  let contentType = "text/csv; charset=utf-8";

  if (type === "stats") {
    const stats = await getMonitoringStats(restaurantId!, branchId);
    content = monitoringStatsCsv(stats as Record<string, number>);
    filename = "monitoring-stats";
  } else if (type === "live") {
    const live = await getLiveCustomers(restaurantId!, branchId);
    content = liveCustomersCsv(live);
    filename = "live-customers";
  } else if (type === "staff") {
    const staff = await getStaffPerformance(restaurantId!);
    content = staffPerformanceCsv(staff);
    filename = "staff-performance";
  } else if (type === "audit") {
    const audit = await getImmutableAuditFeed(restaurantId!, 500);
    content = auditFeedCsv(audit);
    filename = "audit-log";
  } else if (type === "login-history") {
    const logs = await getStaffLoginHistory(restaurantId!, { limit: 500 });
    const headers = ["staffName", "action", "createdAt"];
    const rows = logs.map((l) => ({
      staffName: l.staffName ?? "",
      action: l.action,
      createdAt: l.createdAt.toISOString(),
    }));
    content = "\uFEFF" + [headers.join(","), ...rows.map((r) => headers.map((h) => r[h as keyof typeof r]).join(","))].join("\r\n");
    filename = "login-history";
  } else {
    return NextResponse.json({ error: "نوع غير مدعوم" }, { status: 400 });
  }

  if (format === "pdf") {
    contentType = "text/html; charset=utf-8";
    filename += ".html";
    const lines = content.split("\r\n").slice(1, 21).map((line) => line.split(","));
    content = monitoringPdfHtml("لوحة مراقبة المطعم", [
      { heading: type, rows: lines.length ? lines : [["—", "—"]] },
    ]);
  } else if (format === "xlsx") {
    contentType = "application/vnd.ms-excel; charset=utf-8";
    filename += ".csv";
  } else {
    filename += ".csv";
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
