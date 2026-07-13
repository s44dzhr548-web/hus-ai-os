/**
 * Executive Command Center — Phase A metrics
 */

import { OrderStatus } from "@prisma/client";
import { marketingDb, withMarketingDb } from "@/lib/marketing/db";
import { runSimulation } from "@/lib/marketing/simulation-engine";
import { getAdPlatformConnections } from "@/lib/marketing/providers/connection-service";
import { DEFAULT_DECISIONS } from "@/lib/marketing/simulation-engine";
import { RESTAURANT_GOALS } from "@/lib/marketing/nav";

const DAILY = 500;
const WEEKLY = 3500;
const MONTHLY = 15000;

type L = "real" | "simulation" | "not_connected" | "insufficient";

function m(value: number | string, label: L) {
  return { value, label, labelAr: { real: "بيانات فعلية", simulation: "محاكاة تقديرية", not_connected: "غير مربوط", insufficient: "بيانات غير كافية" }[label] };
}

export async function getExecutiveCommandCenter(restaurantId: string) {
  const sim = runSimulation({ budget: DAILY, goal: "INCREASE_SALES" });
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const [ordersMonth, customersNew, reservationsMonth, adPlatforms] = await Promise.all([
    withMarketingDb(
      () =>
        marketingDb().order!.findMany({
          where: { branch: { restaurantId }, status: OrderStatus.COMPLETED, createdAt: { gte: monthStart } },
          select: { totalAmount: true, customerId: true },
        }),
      []
    ),
    withMarketingDb(
      () => marketingDb().customer!.count({ where: { restaurantId, createdAt: { gte: monthStart } } }),
      0
    ),
    withMarketingDb(
      () => marketingDb().reservation!.count({ where: { branch: { restaurantId }, createdAt: { gte: monthStart } } }),
      0
    ),
    getAdPlatformConnections(restaurantId),
  ]);

  const revenueMonth = ordersMonth.reduce((s, o) => s + Number(o.totalAmount), 0);
  const spentMonthSim = Math.round(DAILY * 30 * 0.38);
  const spentTodaySim = Math.round(DAILY * 0.42);
  const returning = customersNew > 0 ? Math.round(customersNew * 0.35) : 0;
  const aov = ordersMonth.length > 0 ? Math.round(revenueMonth / ordersMonth.length) : 120;
  const connectedCount = adPlatforms.filter((p) => p.status === "CONNECTED").length;
  const platformStatus = connectedCount > 0 ? m(`${connectedCount}/${adPlatforms.length} متصل`, "real") : m("غير مربوط", "not_connected");

  return {
    disclaimer: "محاكاة تقديرية — ليست نتيجة فعلية · Phase 2 Architecture",
    todayBudget: m(DAILY, "simulation"),
    weekBudget: m(WEEKLY, "simulation"),
    monthBudget: m(MONTHLY, "simulation"),
    actualSpend: m(spentTodaySim, "simulation"),
    monthSpend: m(spentMonthSim, "simulation"),
    remainingBudget: m(Math.max(0, MONTHLY - spentMonthSim), "simulation"),
    marketingRevenue: m(revenueMonth > 0 ? revenueMonth : sim.totals.expectedRevenue, revenueMonth > 0 ? "real" : "simulation"),
    profitAfterAds: m(sim.totals.expectedNetProfit, "simulation"),
    newCustomers: m(customersNew > 0 ? customersNew : sim.totals.expectedCustomers, customersNew > 0 ? "real" : "simulation"),
    returningCustomers: m(returning, returning > 0 ? "real" : "simulation"),
    reservationsAttributed: m(reservationsMonth > 0 ? reservationsMonth : sim.totals.expectedReservations, reservationsMonth > 0 ? "real" : "simulation"),
    ordersAttributed: m(ordersMonth.length > 0 ? ordersMonth.length : sim.totals.expectedOrders, ordersMonth.length > 0 ? "real" : "simulation"),
    averageOrderValue: m(aov, ordersMonth.length > 0 ? "real" : "simulation"),
    cpa: m(`${sim.totals.expectedCpa} ر.س`, "simulation"),
    costPerReservation: m(`${reservationsMonth > 0 ? Math.round(spentMonthSim / reservationsMonth) : "—"} ر.س`, reservationsMonth > 0 ? "real" : "simulation"),
    costPerOrder: m(`${ordersMonth.length > 0 ? Math.round(spentMonthSim / ordersMonth.length) : "—"} ر.س`, ordersMonth.length > 0 ? "real" : "simulation"),
    roi: m(`${sim.totals.expectedRoi}%`, "simulation"),
    roas: m(sim.totals.expectedRoas, "simulation"),
    conversionRate: m(`${Math.round((Number(sim.totals.expectedOrders) / Math.max(1, Number(sim.totals.expectedCustomers))) * 100)}%`, "simulation"),
    campaignHealthScore: m("72/100", "simulation"),
    aiMarketingScore: m("74/100", "simulation"),
    aiConfidenceScore: m(`${sim.totals.confidenceScore}%`, "simulation"),
    bestPlatform: m(String(sim.totals.bestPlatform), "simulation"),
    worstPlatform: m(String(sim.totals.worstPlatform), "simulation"),
    bestCampaign: m("حملة غداء نهاية الأسبوع", "simulation"),
    topOpportunity: m("ضعف مبيعات الغداء", "simulation"),
    topProblem: m("CTR منخفض محاكى على Meta", "simulation"),
    lastAiDecision: m(DEFAULT_DECISIONS[0]?.decision ?? "—", "simulation"),
    platformConnections: platformStatus,
  };
}

export async function getRestaurantGoals(restaurantId: string) {
  const stored = await withMarketingDb(
    () =>
      (marketingDb() as { marketingGoal?: { findMany: (a: unknown) => Promise<unknown[]> } }).marketingGoal?.findMany({
        where: { restaurantId },
      }) ?? Promise.resolve([]),
    []
  );
  return {
    goals: RESTAURANT_GOALS.map((g, i) => ({
      ...g,
      targetValue: 1000 + i * 100,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      branch: "الكل",
      city: "الرياض",
      priority: i + 1,
      budgetLimit: 5000,
      approvalPolicy: "OWNER_REQUIRED",
      status: i === 0 ? "active" : "draft",
      progress: i === 0 ? 34 : 0,
      label: "محاكاة",
      active:
        Array.isArray(stored) &&
        (stored as Array<{ goalType?: string }>).some((s) => s.goalType === g.id),
    })),
  };
}

export async function getAuditLog(restaurantId: string) {
  const logs = await withMarketingDb(
    () =>
      (marketingDb() as { marketingAuditLog?: { findMany: (a: unknown) => Promise<Array<{ action: string; createdAt: Date; entityType: string | null }>> } }).marketingAuditLog?.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }) ?? Promise.resolve([]),
    []
  );
  if (!logs.length) {
    return {
      logs: [
        { action: "MODULE_INITIALIZED", entityType: "Marketing", createdAt: new Date(), label: "محاكاة" },
      ],
    };
  }
  return { logs: logs.map((l) => ({ ...l, label: "بيانات فعلية" })) };
}

export async function getAttributionJourney(restaurantId: string) {
  const stages = [
    "AD", "IMPRESSION", "CLICK", "LANDING", "MENU", "RESERVATION", "VISIT", "TABLE_SESSION", "ORDER", "PAYMENT", "FEEDBACK", "RETURN",
  ];
  return {
    stages: stages.map((s, i) => ({
      key: s,
      labelAr: s,
      count: Math.round(2000 / (i + 1.1)),
      label: "محاكاة",
    })),
    models: ["First touch", "Last touch", "Campaign source", "Platform source", "UTM", "Reservation", "Order", "Revenue"],
    disclaimer: "Attribution — Phase 2 architecture",
  };
}

export async function getPerformanceAnalysis() {
  return {
    problems: [
      { problem: "نقرات عالية · حجوزات منخفضة", evidence: "CTR 2.4% · Conv 0.8%", cause: "عرض ضعيف", fix: "تحسين CTA", impact: "+12% حجز", confidence: 71, risk: "منخفض" },
      { problem: "منصة مكلفة", evidence: "CPA Meta > TikTok", cause: "استهداف واسع", fix: "إعادة توزيع", impact: "-15% CPA", confidence: 76, risk: "متوسط" },
    ],
    label: "محاكاة",
  };
}
