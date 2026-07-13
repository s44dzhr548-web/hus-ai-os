/**
 * Phase D — Pluggable transparent simulation engine
 * Replace assumptions with live data via MarketingSimulationService adapter
 */

import { GOAL_WEIGHTS, PLATFORM_CPA, PLATFORMS, ALLOCATION_REASONS, SMART_ALLOCATION_500 } from "@/lib/marketing/nav";

export interface SimulationInput {
  budget: number;
  goal?: string;
  city?: string;
  branch?: string;
  durationDays?: number;
  timeOfDay?: "morning" | "lunch" | "dinner" | "all";
  dayOfWeek?: number;
  isWeekend?: boolean;
  season?: string;
  occasion?: string;
  restaurantType?: string;
  averageOrderValue?: number;
  profitMargin?: number;
  existingCustomers?: number;
  historicalReservations?: number;
  historicalOrders?: number;
  historicalVisits?: number;
  returnRate?: number;
  reservationConversionRate?: number;
  reservePercent?: number;
}

export interface AllocationRow {
  platform: string;
  labelAr: string;
  amount: number;
  percent: number;
  expectedReach: number;
  expectedCustomers: number;
  expectedReservations: number;
  expectedOrders: number;
  expectedRevenue: number;
  expectedGrossProfit: number;
  expectedNetProfit: number;
  expectedCpa: number;
  expectedRoi: number;
  expectedRoas: number;
  confidenceScore: number;
  riskLevel: string;
  reason: string;
}

export interface FullSimulationResult {
  label: "محاكاة تقديرية — ليست نتيجة فعلية";
  assumptions: string[];
  recommendedBudget?: number;
  recommendedBudgetReason?: string;
  platforms: AllocationRow[];
  totals: Record<string, number | string>;
  forecasts: { best: Record<string, number>; expected: Record<string, number>; worst: Record<string, number> };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function allocateBudget(budget: number, goal = "INCREASE_SALES", overrides?: Record<string, number>, reservePercent = 0) {
  const spendable = Math.round(budget * (1 - reservePercent / 100));
  const weights = GOAL_WEIGHTS[goal] || GOAL_WEIGHTS.INCREASE_SALES;

  if (overrides && Object.keys(overrides).length) {
    const entries = PLATFORMS.filter((p) => p.key !== "RESERVE").map((p) => ({
      platform: p.key,
      labelAr: p.labelAr,
      amount: Math.max(0, overrides[p.key] ?? 0),
    }));
    const total = entries.reduce((s, e) => s + e.amount, 0);
    return {
      entries: entries.map((e) => ({ ...e, percent: budget > 0 ? round((e.amount / budget) * 100) : 0 })),
      totalAllocated: total,
      unallocated: round(Math.max(0, budget - total)),
      overBudget: total > budget,
      reserve: Math.round(budget * (reservePercent / 100)),
    };
  }

  const scale = spendable / 500;
  const entries: Array<{ platform: string; labelAr: string; amount: number; percent: number }> =
    SMART_ALLOCATION_500.map((s) => ({
      platform: s.platform,
      labelAr: PLATFORMS.find((p) => p.key === s.platform)?.labelAr ?? s.platform,
      amount: Math.round(s.amount * scale),
      percent: s.percent,
    }));
  const allocated = entries.reduce((s, e) => s + e.amount, 0);
  const reserve = budget - allocated;
  if (reserve > 0 && reservePercent > 0) {
    entries.push({ platform: "RESERVE", labelAr: "احتياطي", amount: reserve, percent: round((reserve / budget) * 100) });
  }
  return { entries, totalAllocated: allocated + (reserve > 0 ? reserve : 0), unallocated: 0, overBudget: false, reserve };
}

export function runSimulation(input: SimulationInput): FullSimulationResult {
  const budget = input.budget || 500;
  const aov = input.averageOrderValue ?? 120;
  const margin = (input.profitMargin ?? 32) / 100;
  const resRate = input.reservationConversionRate ?? 0.35;
  const orderRate = 0.72;
  const visitRate = 0.85;
  const ctr = 0.024;
  const duration = input.durationDays ?? 1;
  const weekendBoost = input.isWeekend ? 1.15 : 1;
  const timeBoost = input.timeOfDay === "lunch" ? 1.12 : input.timeOfDay === "dinner" ? 1.08 : 1;
  const reservePercent = input.reservePercent ?? 5;

  const alloc = allocateBudget(budget, input.goal, undefined, reservePercent);
  const platforms: AllocationRow[] = alloc.entries
    .filter((e) => e.platform !== "RESERVE")
    .map((e) => {
      const baseCpa = PLATFORM_CPA[e.platform] ?? 40;
      const adjustedCpa = baseCpa / (weekendBoost * timeBoost);
      const customers = e.amount > 0 ? Math.floor(e.amount / adjustedCpa) : 0;
      const reach = Math.round(customers / ctr);
      const reservations = Math.round(customers * resRate);
      const orders = Math.round(customers * orderRate);
      const revenue = round(orders * aov);
      const gross = round(revenue * margin);
      const net = round(gross - e.amount);
      const roi = e.amount > 0 ? round((net / e.amount) * 100) : 0;
      const roas = e.amount > 0 ? round(revenue / e.amount) : 0;
      return {
        platform: e.platform,
        labelAr: e.labelAr,
        amount: e.amount,
        percent: e.percent,
        expectedReach: reach,
        expectedCustomers: customers,
        expectedReservations: reservations,
        expectedOrders: orders,
        expectedRevenue: revenue,
        expectedGrossProfit: gross,
        expectedNetProfit: net,
        expectedCpa: round(adjustedCpa),
        expectedRoi: roi,
        expectedRoas: roas,
        confidenceScore: 68 + (e.platform === "TIKTOK" ? 8 : 0),
        riskLevel: e.platform === "GOOGLE" ? "متوسط" : "منخفض",
        reason: ALLOCATION_REASONS[e.platform] ?? "",
      };
    });

  const expectedCustomers = platforms.reduce((s, p) => s + p.expectedCustomers, 0);
  const expectedReach = platforms.reduce((s, p) => s + p.expectedReach, 0);
  const expectedClicks = Math.round(expectedReach * ctr);
  const expectedReservations = platforms.reduce((s, p) => s + p.expectedReservations, 0);
  const expectedOrders = Math.round(expectedCustomers * orderRate);
  const expectedVisits = Math.round(expectedCustomers * visitRate);
  const expectedRevenue = round(expectedOrders * aov);
  const expectedGrossProfit = round(expectedRevenue * margin);
  const expectedAdCost = budget * duration;
  const expectedNetProfit = round(expectedGrossProfit - expectedAdCost);
  const expectedRoi = expectedAdCost > 0 ? round((expectedNetProfit / expectedAdCost) * 100) : 0;
  const expectedRoas = expectedAdCost > 0 ? round(expectedRevenue / expectedAdCost) : 0;
  const expectedCpa = expectedCustomers > 0 ? round(expectedAdCost / expectedCustomers) : 0;

  const sorted = [...platforms].sort((a, b) => b.expectedNetProfit - a.expectedNetProfit);
  const recommendedBudget = 430;
  const mult = (f: number) => ({
    reach: Math.round(expectedReach * f),
    customers: Math.round(expectedCustomers * f),
    revenue: round(expectedRevenue * f),
    profit: round(expectedNetProfit * f),
  });

  return {
    label: "محاكاة تقديرية — ليست نتيجة فعلية",
    recommendedBudget: budget > recommendedBudget ? recommendedBudget : undefined,
    recommendedBudgetReason:
      budget > recommendedBudget
        ? "الإنفاق فوق 430 ريال لا يتوقع أن يحقق زيادة مناسبة في الربح"
        : undefined,
    assumptions: [
      `CTR: ${ctr * 100}% · CPA: Meta ${PLATFORM_CPA.META}/TikTok ${PLATFORM_CPA.TIKTOK}/Snap ${PLATFORM_CPA.SNAPCHAT}/Google ${PLATFORM_CPA.GOOGLE} ر.س`,
      `AOV: ${aov} ر.س · Margin: ${margin * 100}% · Reserve: ${reservePercent}%`,
      `Reservation rate: ${resRate * 100}% · Order rate: ${orderRate * 100}% · Visit rate: ${visitRate * 100}%`,
      `Duration: ${duration}d · Weekend boost: ${weekendBoost}x · Connected platform data: غير متوفر`,
    ],
    platforms,
    totals: {
      budget,
      unallocated: alloc.unallocated,
      expectedReach,
      expectedClicks,
      expectedCustomers,
      expectedReservations,
      expectedVisits,
      expectedOrders,
      expectedRevenue,
      expectedGrossProfit,
      expectedAdCost,
      expectedNetProfit,
      expectedCpa,
      expectedRoi,
      expectedRoas,
      bestPlatform: sorted[0]?.labelAr ?? "—",
      worstPlatform: sorted[sorted.length - 1]?.labelAr ?? "—",
      confidenceScore: 72,
      riskRange: "±18%",
    },
    forecasts: {
      best: mult(1.25),
      expected: mult(1),
      worst: mult(0.72),
    },
  };
}

export function stubAssistantReply(q: string): { content: string; source: "simulation" | "provider" } {
  const question = q.trim();
  if (/500|أنفق|اين|أين|riyal/i.test(question)) {
    const sim = runSimulation({ budget: 500 });
    return {
      content: `[محاكاة] Meta 180 · TikTok 140 · Snap 120 · Google 60 ر.س. ${sim.label}`,
      source: "simulation",
    };
  }
  if (/meta|tiktok|قارن/i.test(question)) {
    return { content: "[محاكاة] TikTok CPA أقل في المعادلة — غير مربوط ببيانات منصة.", source: "simulation" };
  }
  if (/تقرير|أسبوع/i.test(question)) {
    return { content: "[محاكاة] راجع التقارير → تقرير أسبوعي (تصدير PDF قريبًا).", source: "simulation" };
  }
  if (/غداء|حملة|وطني/i.test(question)) {
    return { content: "[محاكاة] وضع Simulation Mode — اربط Marketing Brain لتوليد حملة فعلية.", source: "simulation" };
  }
  return {
    content: "[Simulation Mode] لا مزود AI متصل — اسأل عن الميزانية، ROAS، أو المنصات.",
    source: "simulation",
  };
}

export const DEFAULT_DECISIONS = [
  {
    decision: "انقل 40 ريال من Meta إلى TikTok",
    reason: "CPA محاكى أقل على TikTok",
    dataUsed: "محاكاة Phase D",
    expectedImpact: "+18% ربح متوقع",
    risk: "منخفض",
    confidence: 78,
    needsApproval: true,
    status: "Recommended",
  },
  {
    decision: "خفّض الميزانية اليومية إلى 430 ريال",
    reason: "تشبع عائد عند 430",
    dataUsed: "منحنى ROI",
    expectedImpact: "ROI أعلى",
    risk: "متوسط",
    confidence: 74,
    needsApproval: true,
    status: "Recommended",
  },
];
