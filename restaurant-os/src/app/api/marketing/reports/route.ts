import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { getMarketingDashboardMetrics } from "@/lib/marketing/dashboard-metrics";
import { getLatestMetrics } from "@/lib/marketing/monitoring";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const period = req.nextUrl.searchParams.get("period") || "monthly";
  const format = req.nextUrl.searchParams.get("format") || "json";

  const [metrics, campaignMetrics, campaigns] = await Promise.all([
    getMarketingDashboardMetrics(restaurantId!),
    getLatestMetrics(restaurantId!),
    prisma.marketingCampaign.findMany({
      where: { restaurantId: restaurantId!, deletedAt: null },
      select: { id: true, name: true, status: true, budget: true, spent: true, goal: true },
    }),
  ]);

  const report = {
    period,
    generatedAt: new Date().toISOString(),
    summary: metrics,
    campaignComparison: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      budget: Number(c.budget ?? 0),
      spent: Number(c.spent ?? 0),
      goal: c.goal,
      roi: Number(c.spent) > 0 ? ((Number(c.budget) - Number(c.spent)) / Number(c.spent)) * 100 : null,
    })),
    metricsHistory: campaignMetrics,
  };

  if (format === "csv") {
    const rows = [
      ["Metric", "Value"],
      ["Today Sales", metrics.todaySales],
      ["Weekly Sales", metrics.weeklySales],
      ["Monthly Sales", metrics.monthlySales],
      ["Revenue", metrics.revenue],
      ["ROI", metrics.marketingRoi ?? ""],
      ["AI Score", metrics.aiMarketingScore],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="marketing-report-${period}.csv"`,
      },
    });
  }

  return NextResponse.json(report);
}
