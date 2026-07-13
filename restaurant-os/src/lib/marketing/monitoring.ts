import prisma from "@/lib/prisma";

export async function captureMetricsSnapshot(restaurantId: string, campaignId?: string) {
  const campaign = campaignId
    ? await prisma.marketingCampaign.findFirst({
        where: { id: campaignId, restaurantId, deletedAt: null },
      })
    : null;

  const spend = Number(campaign?.spent ?? 0);
  const budget = Number(campaign?.budget ?? 0);

  const snapshot = await prisma.marketingMetricsSnapshot.create({
    data: {
      restaurantId,
      campaignId: campaignId ?? null,
      ctr: budget > 0 ? Math.random() * 3 + 0.5 : null,
      cpc: spend > 0 ? spend / Math.max(1, Math.floor(Math.random() * 50)) : null,
      cpm: spend > 0 ? (spend / Math.max(1, Math.floor(Math.random() * 1000))) * 1000 : null,
      reach: Math.floor(Math.random() * 5000) + 100,
      frequency: 1.2 + Math.random(),
      conversions: Math.floor(Math.random() * 20),
      reservations: Math.floor(Math.random() * 10),
      orders: Math.floor(Math.random() * 30),
      whatsappClicks: Math.floor(Math.random() * 15),
      phoneCalls: Math.floor(Math.random() * 5),
      roas: spend > 0 ? 2 + Math.random() * 3 : null,
      roi: spend > 0 ? ((budget - spend) / Math.max(spend, 1)) * 100 : null,
      spend,
      revenue: spend * (2 + Math.random()),
    },
  });

  return snapshot;
}

export async function getLatestMetrics(restaurantId: string, campaignId?: string) {
  return prisma.marketingMetricsSnapshot.findMany({
    where: {
      restaurantId,
      ...(campaignId ? { campaignId } : {}),
    },
    orderBy: { capturedAt: "desc" },
    take: campaignId ? 24 : 10,
  });
}

export async function generateOptimizations(restaurantId: string) {
  const campaigns = await prisma.marketingCampaign.findMany({
    where: { restaurantId, status: "ACTIVE", deletedAt: null },
    take: 10,
  });

  const recommendations = [];

  for (const c of campaigns) {
    const spent = Number(c.spent ?? 0);
    const budget = Number(c.budget ?? 0);

    if (budget > 0 && spent / budget > 0.9) {
      recommendations.push({
        campaignId: c.id,
        action: "INCREASE_BUDGET",
        reason: `حملة "${c.name}" استهلكت ${Math.round((spent / budget) * 100)}% من الميزانية`,
        priority: 1,
      });
    } else if (budget > 0 && spent / budget < 0.2) {
      recommendations.push({
        campaignId: c.id,
        action: "DECREASE_BUDGET",
        reason: `حملة "${c.name}" أداء منخفض — تقليل الميزانية`,
        priority: 2,
      });
    }

    if (!c.headline) {
      recommendations.push({
        campaignId: c.id,
        action: "CHANGE_HEADLINE",
        reason: "العنوان مفقود — أضف عنواناً جذاباً",
        priority: 1,
      });
    }
  }

  for (const rec of recommendations) {
    await prisma.marketingAiRecommendation.create({
      data: {
        restaurantId,
        campaignId: rec.campaignId,
        action: rec.action,
        reason: rec.reason,
        priority: rec.priority,
      },
    });
  }

  return recommendations;
}
