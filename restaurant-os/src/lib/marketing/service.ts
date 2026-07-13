import { OrderStatus } from "@prisma/client";
import { allocateBudget, runSimulation, DEFAULT_DECISIONS } from "@/lib/marketing/simulation-engine";
import { BUDGET_GOALS, PLATFORMS, INTEGRATIONS, AUTOMATION_TYPES, CAMPAIGN_STATUSES } from "@/lib/marketing/nav";
import { marketingDb, withMarketingDb } from "@/lib/marketing/db";

const DEFAULT_DAILY = 500;

export async function ensureMarketingSeed(restaurantId: string, userId?: string) {
  await withMarketingDb(async () => {
    const db = marketingDb();
    if (!db.marketingBudget) return;

    const budgetCount = await db.marketingBudget.count({ where: { restaurantId } });
    if (budgetCount === 0) {
      const sim = runSimulation({ budget: DEFAULT_DAILY, goal: "INCREASE_SALES" });
      await db.marketingBudget.create({
        data: {
          restaurantId,
          dailyBudget: DEFAULT_DAILY,
          weeklyBudget: DEFAULT_DAILY * 7,
          monthlyBudget: DEFAULT_DAILY * 30,
          distributionJson: sim.platforms,
        },
      });
    }

    if (db.mcPlatformConfig) {
      const platformCount = await db.mcPlatformConfig.count({ where: { restaurantId } });
      if (platformCount === 0) {
        const sim = runSimulation({ budget: DEFAULT_DAILY });
        await db.mcPlatformConfig.createMany({
          data: sim.platforms.map((p, i) => ({
            restaurantId,
            platformKey: p.platform,
            labelAr: p.labelAr,
            status: "NOT_CONNECTED",
            budgetAllocated: p.amount,
            spent: 0,
            expectedCustomers: p.expectedCustomers,
            expectedReservations: p.expectedReservations,
            expectedRevenue: p.expectedRevenue,
            expectedProfit: p.expectedNetProfit,
            confidenceScore: p.confidenceScore,
            sortOrder: i,
          })),
        });
      }
    }

    if (db.marketingDecision) {
      const decisionCount = await db.marketingDecision.count({ where: { restaurantId } });
      if (decisionCount === 0) {
        await db.marketingDecision.create({
          data: {
            restaurantId,
            fromPlatform: "Meta",
            toPlatform: "TikTok",
            amount: 40,
            reason: DEFAULT_DECISIONS[0]?.reason ?? "Lower CPA in simulation",
            expectedProfitPct: 18,
          },
        });
      }
    }

    if (db.marketingGoal) {
      const goalCount = await db.marketingGoal.count({ where: { restaurantId } });
      if (goalCount === 0) {
        await db.marketingGoal.create({ data: { restaurantId, goalType: "INCREASE_SALES" } });
      }
    }
  }, undefined);
  void userId;
}

export async function getMarketingOverview(restaurantId: string) {
  await ensureMarketingSeed(restaurantId);

  const budget = await withMarketingDb(
    () =>
      marketingDb().marketingBudget?.findFirst({
        where: { restaurantId },
        orderBy: { updatedAt: "desc" },
      }) ?? Promise.resolve(null),
    null
  );

  const daily = Number(budget?.dailyBudget ?? DEFAULT_DAILY);
  const weekly = Number(budget?.weeklyBudget ?? daily * 7);
  const monthly = Number(budget?.monthlyBudget ?? daily * 30);
  const sim = runSimulation({ budget: daily, goal: "INCREASE_SALES" });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const ordersToday = await withMarketingDb(
    () =>
      marketingDb().order!.findMany({
        where: {
          branch: { restaurantId },
          status: OrderStatus.COMPLETED,
          createdAt: { gte: todayStart },
        },
        select: { totalAmount: true },
      }),
    []
  );
  const realSalesToday = ordersToday.reduce((s, o) => s + Number(o.totalAmount), 0);

  return {
    dataSource: "simulation" as const,
    disclaimer: "محاكاة تقديرية — ليست نتيجة فعلية",
    todayBudget: { value: daily, label: "محاكاة" },
    weekBudget: { value: weekly, label: "محاكاة" },
    monthBudget: { value: monthly, label: "محاكاة" },
    expectedRevenue: { value: sim.totals.expectedRevenue, label: "محاكاة" },
    expectedProfit: { value: sim.totals.expectedNetProfit, label: "محاكاة" },
    expectedCustomers: { value: sim.totals.expectedCustomers, label: "محاكاة" },
    expectedReservations: { value: sim.totals.expectedReservations, label: "محاكاة" },
    expectedCpa: {
      value:
        Number(sim.totals.expectedCustomers) > 0
          ? Math.round(daily / Number(sim.totals.expectedCustomers))
          : 0,
      label: "محاكاة",
    },
    expectedRoi: { value: sim.totals.expectedRoi, label: "محاكاة" },
    bestPlatform: { value: sim.totals.bestPlatform, label: "محاكاة" },
    worstPlatform: { value: sim.totals.worstPlatform, label: "محاكاة" },
    aiScore: { value: 74, label: "بيانات تجريبية" },
    confidence: { value: sim.totals.confidenceScore, label: "محاكاة" },
    realSalesToday: realSalesToday > 0 ? { value: realSalesToday, label: "بيانات فعلية" } : null,
    platformsConnected: false,
  };
}

export async function getBudgetScenarios(restaurantId: string) {
  await ensureMarketingSeed(restaurantId);
  const budgets = await withMarketingDb(
    () => marketingDb().marketingBudget?.findMany({ where: { restaurantId }, orderBy: { updatedAt: "desc" }, take: 10 }) ?? Promise.resolve([]),
    []
  );
  const goals = await withMarketingDb(
    () => marketingDb().marketingGoal?.findMany({ where: { restaurantId, isActive: true } }) ?? Promise.resolve([]),
    []
  );
  const scenarios =
    budgets.length > 0
      ? budgets.map((b) => ({
          id: String(b.id),
          daily: Number(b.dailyBudget),
          weekly: Number(b.weeklyBudget),
          monthly: Number(b.monthlyBudget),
          updatedAt: b.updatedAt,
          label: "محاكاة",
        }))
      : [{ id: "default", daily: DEFAULT_DAILY, weekly: DEFAULT_DAILY * 7, monthly: DEFAULT_DAILY * 30, label: "محاكاة" }];
  return {
    scenarios,
    activeGoal: String(goals[0]?.goalType ?? "INCREASE_SALES"),
    goalOptions: BUDGET_GOALS,
  };
}

export async function saveBudgetScenario(
  restaurantId: string,
  data: { daily: number; weekly: number; monthly: number; goal?: string }
) {
  const sim = runSimulation({ budget: data.daily, goal: data.goal });
  const budget = await withMarketingDb(
    () =>
      marketingDb().marketingBudget?.create({
        data: {
          restaurantId,
          dailyBudget: data.daily,
          weeklyBudget: data.weekly,
          monthlyBudget: data.monthly,
          distributionJson: sim.platforms,
        },
      }) ?? Promise.resolve({ id: `sim-${Date.now()}` }),
    { id: `sim-${Date.now()}` }
  );
  if (data.goal && marketingDb().marketingGoal) {
    await withMarketingDb(
      () =>
        marketingDb().marketingGoal!.upsert({
          where: { restaurantId_goalType: { restaurantId, goalType: data.goal } },
          create: { restaurantId, goalType: data.goal },
          update: { isActive: true },
        }),
      undefined
    );
  }
  return { id: budget.id, simulation: sim, label: "محاكاة" };
}

export async function getAllocation(restaurantId: string, budget?: number, goal?: string) {
  await ensureMarketingSeed(restaurantId);
  const b = await withMarketingDb(
    () =>
      marketingDb().marketingBudget?.findFirst({ where: { restaurantId }, orderBy: { updatedAt: "desc" } }) ??
      Promise.resolve(null),
    null
  );
  const amount = budget ?? Number(b?.dailyBudget ?? DEFAULT_DAILY);
  const sim = runSimulation({ budget: amount, goal: goal ?? "INCREASE_SALES" });
  return {
    budget: amount,
    unallocated: sim.totals.unallocated,
    disclaimer: sim.label,
    platforms: sim.platforms,
    label: "محاكاة",
  };
}

export async function getPlatformsPerformance(restaurantId: string) {
  await ensureMarketingSeed(restaurantId);
  const platforms = await withMarketingDb(
    () =>
      marketingDb().mcPlatformConfig?.findMany({ where: { restaurantId }, orderBy: { sortOrder: "asc" } }) ??
      Promise.resolve([]),
    []
  );
  if (!platforms.length) {
    return runSimulation({ budget: DEFAULT_DAILY }).platforms.map((p) => ({
      key: p.platform,
      labelAr: p.labelAr,
      status: "غير مربوط",
      budget: p.amount,
      spend: 0,
      customers: p.expectedCustomers,
      reservations: p.expectedReservations,
      orders: Math.round(p.expectedCustomers * 0.72),
      revenue: p.expectedRevenue,
      cpa: p.expectedCpa,
      roi: 0,
      roas: 0,
      confidence: p.confidenceScore,
      label: "محاكاة",
    }));
  }
  return platforms.map((p) => ({
    key: p.platformKey,
    labelAr: p.labelAr,
    status: p.status === "NOT_CONNECTED" ? "غير مربوط" : "بيانات محاكاة",
    budget: Number(p.budgetAllocated ?? 0),
    spend: Number(p.spent ?? 0),
    customers: Number(p.expectedCustomers ?? 0),
    reservations: Number(p.expectedReservations ?? 0),
    orders: Math.round(Number(p.expectedCustomers ?? 0) * 0.72),
    revenue: Number(p.expectedRevenue ?? 0),
    cpa: p.expectedCustomers ? Math.round(Number(p.budgetAllocated ?? 0) / Number(p.expectedCustomers)) : 0,
    roi: Number(p.expectedRoi ?? 0),
    roas: p.expectedRoi ? (Number(p.expectedRoi) / 100) * 2 : 0,
    confidence: Number(p.confidenceScore ?? 72),
    label: "محاكاة",
  }));
}

export async function getDecisions(restaurantId: string) {
  await ensureMarketingSeed(restaurantId);
  const db = await withMarketingDb(
    () =>
      marketingDb().marketingDecision?.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take: 10 }) ??
      Promise.resolve([]),
    []
  );
  const cards = [
    ...DEFAULT_DECISIONS,
    ...db.map((d) => ({
      decision: `انقل ${Number(d.amount)} ريال من ${d.fromPlatform} إلى ${d.toPlatform}`,
      reason: String(d.reason),
      dataUsed: "قاعدة البيانات + محاكاة",
      expectedImpact: `+${d.expectedProfitPct ?? 0}% ربح متوقع`,
      risk: "منخفض",
      confidence: 75,
      needsApproval: true,
    })),
  ];
  return { decisions: cards, label: "محاكاة" };
}

export async function getOpportunities(restaurantId: string) {
  await ensureMarketingSeed(restaurantId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [inactiveCustomers, recentOrders, reservations] = await Promise.all([
    withMarketingDb(
      () =>
        marketingDb().customerProfile!.count({
          where: {
            restaurantId,
            marketingConsent: true,
            OR: [{ lastVisitAt: { lt: thirtyDaysAgo } }, { lastVisitAt: null }],
          },
        }),
      0
    ),
    withMarketingDb(
      () => marketingDb().order!.count({ where: { branch: { restaurantId }, createdAt: { gte: thirtyDaysAgo } } }),
      0
    ),
    withMarketingDb(
      () => marketingDb().reservation!.count({ where: { branch: { restaurantId }, createdAt: { gte: thirtyDaysAgo } } }),
      0
    ),
  ]);

  const base = [
    {
      id: "lunch-weak",
      problem: "ضعف مبيعات الغداء",
      cause: "توقيت الإعلانات لا يغطي 12–15",
      campaign: "حملة غداء 15%",
      budget: 200,
      audience: "عملاء الغداء",
      platform: "TikTok",
      roi: "+22%",
      dataLabel: recentOrders > 0 ? "بيانات تجريبية" : "محاكاة",
    },
    {
      id: "reservations-drop",
      problem: "انخفاض الحجوزات",
      cause: "موسم منخفض",
      campaign: "حجز مسبق + عرض",
      budget: 350,
      audience: "أصحاب الحجوزات",
      platform: "Meta",
      roi: "+18%",
      dataLabel: reservations > 0 ? "بيانات تجريبية" : "محاكاة",
    },
    {
      id: "inactive-30",
      problem: "عملاء لم يعودوا منذ 30 يومًا",
      cause: `${inactiveCustomers} عميل بموافقة تسويق`,
      campaign: "إعادة استهداف",
      budget: 150,
      audience: "غير نشطين 30 يوم",
      platform: "Snapchat",
      roi: "+15%",
      dataLabel: inactiveCustomers > 0 ? "بيانات تجريبية" : "محاكاة",
    },
    {
      id: "seasonal",
      problem: "مناسبة موسمية قادمة",
      cause: "تقويم محلي",
      campaign: "عرض موسمي",
      budget: 400,
      audience: "عائلات",
      platform: "Meta",
      roi: "+25%",
      dataLabel: "محاكاة",
    },
  ];

  return { opportunities: base, disclaimer: "محاكاة تقديرية — ليست نتيجة فعلية" };
}

export async function getAudiences(restaurantId: string) {
  const segments = [
    { id: "vip", name: "VIP", consentRequired: true },
    { id: "repeat", name: "عملاء متكررون", consentRequired: true },
    { id: "new", name: "عملاء جدد", consentRequired: true },
    { id: "inactive", name: "غير نشطين", consentRequired: true },
    { id: "families", name: "عائلات", consentRequired: true },
    { id: "lunch", name: "عملاء الغداء", consentRequired: true },
    { id: "dinner", name: "عملاء العشاء", consentRequired: true },
    { id: "reservations", name: "أصحاب الحجوزات", consentRequired: true },
    { id: "high-aov", name: "متوسط فاتورة مرتفع", consentRequired: true },
    { id: "inactive-30", name: "لم يزوروا منذ 30 يومًا", consentRequired: true },
    { id: "inactive-60", name: "لم يزوروا منذ 60 يومًا", consentRequired: true },
    { id: "inactive-90", name: "لم يزوروا منذ 90 يومًا", consentRequired: true },
  ];

  const counts = await Promise.all(
    segments.map(async (s) => {
      let count = 0;
      if (s.id === "new") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        count = await withMarketingDb(
          () =>
            marketingDb().customerProfile!.count({
              where: { restaurantId, createdAt: { gte: d }, marketingConsent: true },
            }),
          0
        );
      } else if (s.id.startsWith("inactive")) {
        const days = s.id === "inactive-30" ? 30 : s.id === "inactive-60" ? 60 : 90;
        const d = new Date();
        d.setDate(d.getDate() - days);
        count = await withMarketingDb(
          () =>
            marketingDb().customerProfile!.count({
              where: {
                restaurantId,
                marketingConsent: true,
                OR: [{ lastVisitAt: { lt: d } }, { lastVisitAt: null }],
              },
            }),
          0
        );
      } else {
        count = await withMarketingDb(
          () => marketingDb().customerProfile!.count({ where: { restaurantId, marketingConsent: true } }),
          0
        );
      }
      return { ...s, count, label: count > 0 ? "بيانات تجريبية" : "محاكاة" };
    })
  );

  return {
    audiences: counts,
    consentNote: "يُستخدم فقط العملاء ذوو موافقة تسويق صالحة للحملات",
  };
}

export async function getCampaignDrafts(restaurantId: string) {
  const campaigns = await withMarketingDb(
    () =>
      marketingDb().marketingCampaign?.findMany({ where: { restaurantId }, orderBy: { updatedAt: "desc" }, take: 20 }) ??
      Promise.resolve([]),
    []
  );

  if (campaigns.length === 0) {
    return {
      campaigns: [
        {
          id: "draft-1",
          name: "حملة غداء نهاية الأسبوع",
          goal: "زيادة المبيعات",
          offer: "15% على الغداء",
          status: "مسودة",
          budget: 300,
          label: "محاكاة",
        },
      ],
      statuses: CAMPAIGN_STATUSES,
    };
  }

  return {
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      goal: c.goal ?? "—",
      offer: c.headline ?? c.primaryText ?? "—",
      status: c.status === "DRAFT" ? "مسودة" : c.status,
      budget: Number(c.budget ?? 0),
      label: "محاكاة",
    })),
    statuses: CAMPAIGN_STATUSES,
  };
}

export async function getAutomations() {
  return {
    automations: AUTOMATION_TYPES.map((a) => ({
      id: a.id,
      name: a.labelAr,
      status: "غير مفعل",
      label: "مسودة",
    })),
  };
}

export async function getIntegrationsList() {
  return {
    integrations: INTEGRATIONS.map((i) => ({
      key: i.key,
      labelAr: i.labelAr,
      status: "غير مربوط",
      connect: "قريبًا",
      permissions: "يتطلب إعداد حساب المطور أو موافقة المنصة",
      syncData: "الميزانية · الأداء · الحملات",
      lastSync: null,
    })),
  };
}

export async function getMarketingSettings(restaurantId: string) {
  const budget = await withMarketingDb(
    () =>
      marketingDb().marketingBudget?.findFirst({ where: { restaurantId }, orderBy: { updatedAt: "desc" } }) ??
      Promise.resolve(null),
    null
  );
  const daily = Number(budget?.dailyBudget ?? DEFAULT_DAILY);
  return {
    defaultBudget: daily,
    currency: "SAR",
    defaultGoal: "INCREASE_SALES",
    targetCity: "الرياض",
    targetRadius: 5,
    preferredPlatforms: PLATFORMS.map((p) => p.key),
    approvalRequired: true,
    aiFrequency: "daily",
    consentRules: "marketingConsent=true فقط",
    profitMargin: 32,
    averageOrderValue: 120,
    label: "محاكاة",
  };
}

export async function getReportsList() {
  return {
    reports: [
      { id: "daily", title: "تقرير يومي", export: { pdf: "قريبًا", csv: "قريبًا", excel: "قريبًا" } },
      { id: "weekly", title: "تقرير أسبوعي", export: { pdf: "قريبًا", csv: "قريبًا", excel: "قريبًا" } },
      { id: "monthly", title: "تقرير شهري", export: { pdf: "قريبًا", csv: "قريبًا", excel: "قريبًا" } },
      { id: "budget", title: "تقرير الميزانية", export: { pdf: "قريبًا", csv: "قريبًا", excel: "قريبًا" } },
      { id: "platforms", title: "مقارنة المنصات", export: { pdf: "قريبًا", csv: "قريبًا", excel: "قريبًا" } },
      { id: "simulation", title: "تقرير المحاكاة", export: { pdf: "قريبًا", csv: "قريبًا", excel: "قريبًا" } },
      { id: "acquisition", title: "اكتساب العملاء", export: { pdf: "قريبًا", csv: "قريبًا", excel: "قريبًا" } },
      { id: "reservations", title: "تأثير الحجوزات", export: { pdf: "قريبًا", csv: "قريبًا", excel: "قريبًا" } },
      { id: "profit", title: "الربح المتوقع", export: { pdf: "قريبًا", csv: "قريبًا", excel: "قريبًا" } },
      { id: "decisions", title: "قرارات AI", export: { pdf: "قريبًا", csv: "قريبًا", excel: "قريبًا" } },
    ],
    label: "محاكاة",
  };
}

export async function getGoals(restaurantId: string) {
  const goals = await withMarketingDb(
    () => marketingDb().marketingGoal?.findMany({ where: { restaurantId } }) ?? Promise.resolve([]),
    []
  );
  return {
    goals: BUDGET_GOALS.map((g) => ({
      ...g,
      active: goals.some((x) => String(x.goalType) === g.id && x.isActive !== false),
    })),
  };
}

export { runSimulation, allocateBudget };
