import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import {
  DEFAULT_RECOMMENDATIONS,
  distributeBudget,
  FUTURE_PLATFORMS,
  runSimulation,
} from "@/lib/marketing-center/constants";

export async function ensureMarketingCenterSeed(restaurantId: string) {
  const [budgetCount, recCount, platformCount] = await Promise.all([
    prisma.marketingBudget.count({ where: { restaurantId } }),
    prisma.marketingRecommendation.count({ where: { restaurantId } }),
    prisma.mcPlatformConfig.count({ where: { restaurantId } }),
  ]);

  if (budgetCount === 0) {
    const daily = 500;
    await prisma.marketingBudget.create({
      data: {
        restaurantId,
        dailyBudget: daily,
        weeklyBudget: daily * 7,
        monthlyBudget: daily * 30,
        distributionJson: distributeBudget(daily),
      },
    });
  }

  if (recCount === 0) {
    await prisma.marketingRecommendation.createMany({
      data: DEFAULT_RECOMMENDATIONS.map((r, i) => ({
        restaurantId,
        type: r.type,
        titleAr: r.titleAr,
        description: r.description,
        priority: i + 1,
      })),
    });
  }

  if (platformCount === 0) {
    const daily = 500;
    const dist = distributeBudget(daily);
    await prisma.mcPlatformConfig.createMany({
      data: FUTURE_PLATFORMS.map((p, i) => {
        const d = dist.find((x) => x.platform === p.key);
        return {
          restaurantId,
          platformKey: p.key,
          labelAr: p.labelAr,
          status: "NOT_CONNECTED" as const,
          budgetAllocated: d?.amount ?? 0,
          spent: Math.round((d?.amount ?? 0) * 0.65),
          expectedCustomers: p.key === "TIKTOK" ? 18 : p.key === "META" ? 12 : 8,
          expectedReservations: p.key === "META" ? 6 : 3,
          expectedRevenue: (d?.amount ?? 0) * 14,
          expectedRoi: 320 + i * 20,
          expectedProfit: (d?.amount ?? 0) * 4.5,
          confidenceScore: 72 + i * 2,
          sortOrder: i,
        };
      }),
    });
  }

  const decisionCount = await prisma.marketingDecision.count({ where: { restaurantId } });
  if (decisionCount === 0) {
    await prisma.marketingDecision.create({
      data: {
        restaurantId,
        fromPlatform: "Meta",
        toPlatform: "TikTok",
        amount: 40,
        reason: "Lower customer acquisition cost",
        expectedProfitPct: 18,
      },
    });
  }

  const analyticsCount = await prisma.marketingAnalytics.count({ where: { restaurantId } });
  if (analyticsCount === 0) {
    await prisma.marketingAnalytics.create({
      data: {
        restaurantId,
        ctr: 2.4,
        cpc: 1.85,
        cpa: 42,
        roas: 4.2,
        roi: 320,
        reservations: 14,
        orders: 48,
        customers: 36,
        revenue: 7200,
        profit: 2300,
      },
    });
  }
}

export async function getMarketingCenterHome(restaurantId: string) {
  await ensureMarketingCenterSeed(restaurantId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [budget, analytics, ordersToday] = await Promise.all([
    prisma.marketingBudget.findFirst({ where: { restaurantId }, orderBy: { updatedAt: "desc" } }),
    prisma.marketingAnalytics.findFirst({ where: { restaurantId }, orderBy: { capturedAt: "desc" } }),
    prisma.order.findMany({
      where: {
        branch: { restaurantId },
        status: OrderStatus.COMPLETED,
        createdAt: { gte: todayStart },
      },
      select: { totalAmount: true },
    }),
  ]);

  const todaySales = ordersToday.reduce((s, o) => s + Number(o.totalAmount), 0);
  const todayBudget = Number(budget?.dailyBudget ?? 500);
  const profit = Number(analytics?.profit ?? 2300);
  const revenue = Number(analytics?.revenue ?? 7200);
  const roi = analytics?.roi ?? 320;
  const avgOrder = ordersToday.length ? todaySales / ordersToday.length : 0;

  return {
    aiScore: 78,
    todayBudget,
    todaySales,
    todayProfit: Math.round(profit * 0.08),
    advertisingRoi: roi,
    bestPlatform: "TikTok",
    worstPlatform: "Snapchat",
    customersAcquired: analytics?.customers ?? 36,
    reservations: analytics?.reservations ?? 14,
    averageOrder: avgOrder,
    growthPct: 12.4,
    phase: 1,
    architectureOnly: true,
  };
}

export { runSimulation, distributeBudget };
