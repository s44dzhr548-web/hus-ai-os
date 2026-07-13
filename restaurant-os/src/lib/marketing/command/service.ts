/**
 * Phase 2 — Marketing Command Center service
 * Architecture only: simulation labels until providers connected
 */

import { OrderStatus } from "@prisma/client";
import { marketingDb, withMarketingDb } from "@/lib/marketing/db";
import { runSimulation } from "@/lib/marketing/simulation-engine";
import { getMarketingOverview } from "@/lib/marketing/service";
import { listProvidersForCategory } from "@/lib/marketing/providers/connection-service";

const DEFAULT_DAILY = 500;

/** Budget split: Meta 40 · TikTok 25 · Google 20 · Snap 10 · Reserve 5 */
export const PHASE2_BUDGET_SPLIT = [
  { platform: "META", labelAr: "Meta", percent: 40 },
  { platform: "TIKTOK", labelAr: "TikTok", percent: 25 },
  { platform: "GOOGLE", labelAr: "Google", percent: 20 },
  { platform: "SNAPCHAT", labelAr: "Snap", percent: 10 },
  { platform: "RESERVE", labelAr: "احتياطي", percent: 5 },
] as const;

export const COPY_FORMATS = [
  { id: "INSTAGRAM", labelAr: "Instagram captions" },
  { id: "TIKTOK", labelAr: "TikTok captions" },
  { id: "SNAPCHAT", labelAr: "Snapchat ads" },
  { id: "GOOGLE_ADS", labelAr: "Google Ads" },
  { id: "META_ADS", labelAr: "Meta Ads" },
  { id: "SMS", labelAr: "SMS" },
  { id: "WHATSAPP", labelAr: "WhatsApp" },
  { id: "PUSH", labelAr: "Push Notifications" },
  { id: "EMAIL", labelAr: "Email Marketing" },
] as const;

export const AUTOMATION_RULE_TYPES = [
  { id: "PAUSE_CAMPAIGNS", labelAr: "إيقاف الحملات" },
  { id: "INCREASE_BUDGET", labelAr: "زيادة الميزانية" },
  { id: "DECREASE_BUDGET", labelAr: "تقليل الميزانية" },
  { id: "NOTIFY_OWNER", labelAr: "إشعار المالك" },
  { id: "WEEKLY_REPORT", labelAr: "تقرير أسبوعي" },
  { id: "MONTHLY_REPORT", labelAr: "تقرير شهري" },
] as const;

export const JOURNEY_STAGES = [
  { key: "AD", labelAr: "إعلان" },
  { key: "CLICK", labelAr: "نقرة" },
  { key: "LANDING", labelAr: "صفحة هبوط" },
  { key: "RESERVATION", labelAr: "حجز" },
  { key: "VISIT", labelAr: "زيارة" },
  { key: "ORDER", labelAr: "طلب" },
  { key: "PAYMENT", labelAr: "دفع" },
  { key: "REVIEW", labelAr: "تقييم" },
  { key: "RETURN", labelAr: "زيارة عائدة" },
] as const;

function metric(value: number | string, label: "simulation" | "demo" | "not_connected" | "real" = "simulation") {
  return { value, label };
}

export async function getCommandDashboard(restaurantId: string) {
  const overview = await getMarketingOverview(restaurantId);
  const sim = runSimulation({ budget: DEFAULT_DAILY, goal: "INCREASE_SALES" });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const [ordersToday, ordersMonth, customersMonth, reservationsMonth] = await Promise.all([
    withMarketingDb(
      () =>
        marketingDb().order!.findMany({
          where: { branch: { restaurantId }, status: OrderStatus.COMPLETED, createdAt: { gte: todayStart } },
          select: { totalAmount: true, customerId: true },
        }),
      []
    ),
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
  ]);

  const revenueToday = ordersToday.reduce((s, o) => s + Number(o.totalAmount), 0);
  const revenueMonth = ordersMonth.reduce((s, o) => s + Number(o.totalAmount), 0);
  const spentTodaySim = Math.round(DEFAULT_DAILY * 0.42);
  const spentMonthSim = Math.round(DEFAULT_DAILY * 30 * 0.38);
  const totalBudget = Number(overview.monthBudget.value);
  const remaining = Math.max(0, totalBudget - spentMonthSim);
  const actualCustomers = customersMonth > 0 ? customersMonth : 0;
  const expectedCustomers = Number(sim.totals.expectedCustomers);
  const expectedReservations = Number(sim.totals.expectedReservations);
  const cpa = expectedCustomers > 0 ? Math.round(DEFAULT_DAILY / expectedCustomers) : 0;
  const cpr =
    reservationsMonth > 0
      ? Math.round(spentMonthSim / reservationsMonth)
      : expectedReservations > 0
        ? Math.round(DEFAULT_DAILY / expectedReservations)
        : 0;
  const cpo = ordersMonth.length > 0 ? Math.round(spentMonthSim / ordersMonth.length) : cpa;
  const roas =
    spentMonthSim > 0
      ? Math.round(((revenueMonth || Number(sim.totals.expectedRevenue)) / spentMonthSim) * 100) / 100
      : 0;
  const conversionRate =
    expectedCustomers > 0
      ? Math.round((Number(sim.totals.expectedOrders) / expectedCustomers) * 100)
      : 0;
  const aov = ordersMonth.length > 0 ? Math.round(revenueMonth / ordersMonth.length) : 120;

  return {
    disclaimer: "محاكاة تقديرية — Phase 2 Architecture · غير مربوط بالمنصات",
    totalBudget: metric(totalBudget),
    remainingBudget: metric(remaining),
    spentToday: metric(spentTodaySim),
    spentMonth: metric(spentMonthSim),
    expectedCustomers: metric(expectedCustomers),
    actualCustomers: metric(actualCustomers, actualCustomers > 0 ? "demo" : "simulation"),
    revenueGenerated: metric(revenueMonth > 0 ? revenueMonth : sim.totals.expectedRevenue, revenueMonth > 0 ? "demo" : "simulation"),
    roi: metric(`${sim.totals.expectedRoi}%`),
    roas: metric(roas),
    costPerCustomer: metric(`${cpa} ر.س`),
    costPerReservation: metric(`${cpr} ر.س`),
    costPerOrder: metric(`${cpo} ر.س`),
    conversionRate: metric(`${conversionRate}%`),
    averageOrderValue: metric(`${aov} ر.س`, ordersMonth.length > 0 ? "demo" : "simulation"),
    returningCustomers: metric(Math.round(actualCustomers * 0.35), "simulation"),
    campaignHealthScore: metric("72/100", "simulation"),
    aiConfidenceScore: metric(`${overview.confidence.value}%`),
    revenueToday: revenueToday > 0 ? metric(revenueToday, "demo") : null,
  };
}

export function getBudgetDistributionAI(budget: number, overrides?: Record<string, number>) {
  if (overrides && Object.keys(overrides).length) {
    const total = Object.values(overrides).reduce((a, b) => a + b, 0);
    return {
      budget,
      splits: PHASE2_BUDGET_SPLIT.map((s) => ({
        ...s,
        amount: overrides[s.platform] ?? Math.round(budget * (s.percent / 100)),
      })),
      totalAllocated: total,
      unallocated: Math.max(0, budget - total),
      overBudget: total > budget,
      label: "محاكاة",
    };
  }
  const splits = PHASE2_BUDGET_SPLIT.map((s, i) => {
    const amount = i === PHASE2_BUDGET_SPLIT.length - 1
      ? budget - PHASE2_BUDGET_SPLIT.slice(0, -1).reduce((sum, x) => sum + Math.round(budget * (x.percent / 100)), 0)
      : Math.round(budget * (s.percent / 100));
    return { ...s, amount };
  });
  const sim = runSimulation({ budget: budget * 0.95 });
  return {
    budget,
    splits,
    recommendations: {
      expectedReach: Math.round(Number(sim.totals.expectedCustomers) * 120),
      expectedCustomers: Number(sim.totals.expectedCustomers),
      expectedRevenue: Number(sim.totals.expectedRevenue),
      expectedRoi: sim.totals.expectedRoi,
      expectedRoas: spentRoas(Number(sim.totals.expectedRevenue), budget),
    },
    label: "محاكاة تقديرية — ليست نتيجة فعلية",
  };
}

function spentRoas(revenue: number, spend: number) {
  return spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0;
}

export async function getSmartBudgetRecommendations(restaurantId: string, input: {
  monthly?: number;
  weekly?: number;
  daily?: number;
  city?: string;
  goal?: string;
  targetCustomers?: number;
  aov?: number;
  margin?: number;
}) {
  const daily = input.daily ?? 500;
  const sim = runSimulation({
    budget: daily,
    goal: input.goal,
    city: input.city,
    averageOrderValue: input.aov ?? 120,
    profitMargin: input.margin ?? 32,
  });
  const dist = getBudgetDistributionAI(daily);
  return {
    input,
    distribution: dist,
    simulation: sim,
    label: "محاكاة",
  };
}

export async function getBrainCenter(restaurantId: string) {
  const providers = await listProvidersForCategory(restaurantId, "BRAIN");
  return {
    providers,
    features: {
      enable: true,
      disable: true,
      priority: true,
      defaultAi: providers.find((p) => p.isDefault)?.key ?? null,
      fallbackAi: providers.find((p) => p.isBackup)?.key ?? null,
      autoModelSelect: true,
    },
    label: "Phase 2 — لا اتصال API مدفوع بعد",
  };
}

export async function getCopyCenter(restaurantId: string) {
  const providers = await listProvidersForCategory(restaurantId, "COPY");
  return { providers, formats: COPY_FORMATS, label: "مسودات فقط — لا توليد فعلي" };
}

export async function getAnalyticsCharts(restaurantId: string) {
  const sim = runSimulation({ budget: 500 });
  return {
    daily: Array.from({ length: 7 }, (_, i) => ({ day: i + 1, spend: 400 + i * 20, revenue: 1200 + i * 80, label: "محاكاة" })),
    weekly: Array.from({ length: 4 }, (_, i) => ({ week: i + 1, spend: 2800 + i * 200, label: "محاكاة" })),
    monthly: Array.from({ length: 6 }, (_, i) => ({ month: i + 1, spend: 12000 + i * 500, label: "محاكاة" })),
    platformComparison: sim.platforms.map((p) => ({ platform: p.labelAr, spend: p.amount, customers: p.expectedCustomers, label: "محاكاة" })),
    campaignComparison: [{ name: "حملة غداء", roi: 22, spend: 300, label: "محاكاة" }],
    customerSource: [{ source: "Meta", count: 45, label: "محاكاة" }, { source: "TikTok", count: 38, label: "محاكاة" }],
    revenueSource: [{ source: "Walk-in", amount: 4200, label: "محاكاة" }, { source: "Ads", amount: 2800, label: "محاكاة" }],
    reservationSource: [{ source: "Google", count: 12, label: "محاكاة" }, { source: "Meta", count: 8, label: "محاكاة" }],
    disclaimer: "محاكاة — Phase 2",
  };
}

export async function getAutomationCenter(restaurantId: string) {
  const rules = await withMarketingDb(
    () =>
      (marketingDb() as { marketingAutomationRule?: { findMany: (a: unknown) => Promise<Array<{ ruleType: string; nameAr: string; isEnabled: boolean }>> } }).marketingAutomationRule?.findMany({
        where: { restaurantId },
      }) ?? Promise.resolve([]),
    []
  );
  if (!rules.length) {
    return {
      rules: AUTOMATION_RULE_TYPES.map((r) => ({ ...r, isEnabled: false, status: "غير مفعل" })),
      allOff: true,
      label: "جميع الأتمتة متوقفة حتى التفعيل",
    };
  }
  return { rules, allOff: rules.every((r) => !r.isEnabled), label: "محاكاة" };
}

export async function getCustomerJourney(restaurantId: string) {
  const funnel = JOURNEY_STAGES.map((s, i) => ({
    ...s,
    count: Math.round(1000 / (i + 1.2)),
    dropoff: i > 0 ? `${Math.round(15 + i * 8)}%` : null,
    label: "محاكاة",
  }));
  return { stages: funnel, disclaimer: "Phase 2 — ربط مع منصات الإعلان لاحقًا" };
}

export async function getCampaignBuilderDrafts(restaurantId: string) {
  const campaigns = await withMarketingDb(
    () =>
      marketingDb().marketingCampaign?.findMany({
        where: { restaurantId },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }) ?? Promise.resolve([]),
    []
  );
  if (!campaigns.length) {
    return {
      campaigns: [{
        id: "draft-new",
        name: "حملة جديدة",
        objective: "زيادة المبيعات",
        audience: "عائلات",
        budget: 500,
        platform: "Meta",
        schedule: "2026-07-15 — 2026-07-22",
        creative: "مسودة",
        cta: "احجز الآن",
        status: "مسودة",
        approval: "بانتظار الموافقة",
        label: "محاكاة",
      }],
    };
  }
  return {
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      objective: c.goal ?? "—",
      audience: "—",
      budget: Number(c.budget ?? 0),
      platform: c.platform ?? "—",
      schedule: "—",
      creative: (c as { headline?: string }).headline ?? "—",
      cta: c.cta ?? "—",
      status: "مسودة",
      approval: "بانتظار الموافقة",
      label: "محاكاة",
    })),
  };
}

export const ASSISTANT_STUBS = [
  { q: "Why is my campaign failing?", ar: "لماذا تفشل حملتي؟", a: "[محاكاة] راجع ROAS المنصة وضعف creative — لا بيانات منصة متصلة بعد." },
  { q: "How do I improve ROAS?", ar: "كيف أحسّن ROAS؟", a: "[محاكاة] وزّع الميزانية نحو TikTok في المعادلة الحالية." },
  { q: "How should I spend 500 SAR?", ar: "كيف أنفق 500 ريال؟", a: "[محاكاة] Meta 40% · TikTok 25% · Google 20% · Snap 10% · Reserve 5%." },
  { q: "What platform is performing best?", ar: "ما أفضل منصة؟", a: "[محاكاة] TikTok CPA أقل في المحاكاة — ليست بيانات فعلية." },
];
