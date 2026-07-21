import prisma from "@/lib/prisma";
import { getPlatformOpenAiPublicStatus } from "@/lib/platform/openai-brain";
import type { PlatformBrainRoleId } from "@/lib/platform/ai-providers-constants";
import {
  DEFAULT_DAILY_LIMIT,
  DEFAULT_MONTHLY_COST_SAR,
  DEFAULT_MONTHLY_LIMIT,
  ESTIMATED_COST_PER_REQUEST_SAR,
  PLATFORM_ONLY_AI_ROLE,
  RESTAURANT_AI_ROLE_IDS,
  restaurantRoleLabel,
  type RestaurantAiRoleId,
} from "@/lib/restaurant-ai-access/constants";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getRestaurantAiAccessRow(restaurantId: string) {
  return prisma.restaurantAiAccess.findUnique({ where: { restaurantId } });
}

export async function getRestaurantAiAccessConfig(restaurantId: string) {
  const row = await getRestaurantAiAccessRow(restaurantId);
  return {
    restaurantId,
    enabledRoles: (row?.enabledRoles as string[] | null) ?? [],
    dailyRequestLimit: row?.dailyRequestLimit ?? DEFAULT_DAILY_LIMIT,
    monthlyRequestLimit: row?.monthlyRequestLimit ?? DEFAULT_MONTHLY_LIMIT,
    monthlyCostLimitSar: Number(row?.monthlyCostLimitSar ?? DEFAULT_MONTHLY_COST_SAR),
    servicePaused: row?.servicePaused ?? true,
    configured: Boolean(row),
  };
}

export async function getRestaurantAiUsageStats(restaurantId: string) {
  const dayStart = startOfDay();
  const monthStart = startOfMonth();

  const [dailyAgg, monthlyAgg] = await Promise.all([
    prisma.restaurantAiUsageLog.aggregate({
      where: { restaurantId, createdAt: { gte: dayStart } },
      _count: { id: true },
      _sum: { estimatedCostSar: true },
    }),
    prisma.restaurantAiUsageLog.aggregate({
      where: { restaurantId, createdAt: { gte: monthStart } },
      _count: { id: true },
      _sum: { estimatedCostSar: true },
    }),
  ]);

  return {
    dailyRequests: dailyAgg._count.id,
    monthlyRequests: monthlyAgg._count.id,
    dailyCostSar: Number(dailyAgg._sum.estimatedCostSar ?? 0),
    monthlyCostSar: Number(monthlyAgg._sum.estimatedCostSar ?? 0),
  };
}

export async function assertRestaurantAiAccess(params: {
  restaurantId: string;
  roleId: PlatformBrainRoleId;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (params.roleId === PLATFORM_ONLY_AI_ROLE) {
    return {
      ok: false,
      message: "مهندس المنصة الذكي متاح لمالك المنصة فقط — لا يمكن تفعيله على مستوى المطعم.",
    };
  }

  if (!RESTAURANT_AI_ROLE_IDS.includes(params.roleId as RestaurantAiRoleId)) {
    return { ok: false, message: "خدمة غير مدعومة على مستوى المطعم." };
  }

  const config = await getRestaurantAiAccessConfig(params.restaurantId);

  if (!config.configured || config.enabledRoles.length === 0) {
    return {
      ok: false,
      message: "AI Access غير مفعّل لهذا المطعم — تواصل مع مالك المنصة.",
    };
  }

  if (config.servicePaused) {
    return {
      ok: false,
      message: "تم إيقاف خدمة الذكاء الاصطناعي عن هذا المطعم.",
    };
  }

  if (!config.enabledRoles.includes(params.roleId)) {
    return {
      ok: false,
      message: `خدمة «${restaurantRoleLabel(params.roleId)}» غير مفعّلة لهذا المطعم.`,
    };
  }

  const usage = await getRestaurantAiUsageStats(params.restaurantId);

  if (usage.dailyRequests >= config.dailyRequestLimit) {
    return {
      ok: false,
      message: "تم تجاوز حد الطلبات اليومية لهذا المطعم.",
    };
  }

  if (usage.monthlyRequests >= config.monthlyRequestLimit) {
    return {
      ok: false,
      message: "تم تجاوز حد الطلبات الشهرية لهذا المطعم.",
    };
  }

  if (usage.monthlyCostSar >= config.monthlyCostLimitSar) {
    return {
      ok: false,
      message: "تم تجاوز حد التكلفة الشهرية لهذا المطعم.",
    };
  }

  return { ok: true };
}

export async function recordRestaurantAiUsage(params: {
  restaurantId: string;
  roleId: PlatformBrainRoleId;
  estimatedCostSar?: number;
}) {
  await prisma.restaurantAiUsageLog.create({
    data: {
      restaurantId: params.restaurantId,
      roleId: params.roleId,
      estimatedCostSar: params.estimatedCostSar ?? ESTIMATED_COST_PER_REQUEST_SAR,
    },
  });
}

export async function getRestaurantAiAccessDashboard(restaurantId: string) {
  const [config, usage, openAi] = await Promise.all([
    getRestaurantAiAccessConfig(restaurantId),
    getRestaurantAiUsageStats(restaurantId),
    getPlatformOpenAiPublicStatus(),
  ]);

  const enabledServices = config.enabledRoles.map((id) => ({
    id,
    labelAr: restaurantRoleLabel(id),
  }));

  return {
    title: "AI Access",
    restaurantId,
    openAiStatus: openAi.connected ? "متصل" : "غير متصل",
    openAiModel: openAi.modelId,
    servicePaused: config.servicePaused,
    enabledServices,
    usage: {
      dailyRequests: usage.dailyRequests,
      monthlyRequests: usage.monthlyRequests,
      estimatedMonthlyCostSar: Math.round(usage.monthlyCostSar * 100) / 100,
    },
    limits: {
      dailyRequestLimit: config.dailyRequestLimit,
      monthlyRequestLimit: config.monthlyRequestLimit,
      monthlyCostLimitSar: config.monthlyCostLimitSar,
    },
    remaining: {
      dailyRequests: Math.max(0, config.dailyRequestLimit - usage.dailyRequests),
      monthlyRequests: Math.max(0, config.monthlyRequestLimit - usage.monthlyRequests),
      monthlyCostSar:
        Math.round(Math.max(0, config.monthlyCostLimitSar - usage.monthlyCostSar) * 100) / 100,
    },
  };
}

export async function updateRestaurantAiAccess(params: {
  restaurantId: string;
  enabledRoles?: RestaurantAiRoleId[];
  dailyRequestLimit?: number;
  monthlyRequestLimit?: number;
  monthlyCostLimitSar?: number;
  servicePaused?: boolean;
  userId: string;
}) {
  const roles = (params.enabledRoles ?? []).filter((r) =>
    RESTAURANT_AI_ROLE_IDS.includes(r)
  );

  return prisma.restaurantAiAccess.upsert({
    where: { restaurantId: params.restaurantId },
    create: {
      restaurantId: params.restaurantId,
      enabledRoles: roles,
      dailyRequestLimit: params.dailyRequestLimit ?? DEFAULT_DAILY_LIMIT,
      monthlyRequestLimit: params.monthlyRequestLimit ?? DEFAULT_MONTHLY_LIMIT,
      monthlyCostLimitSar: params.monthlyCostLimitSar ?? DEFAULT_MONTHLY_COST_SAR,
      servicePaused: params.servicePaused ?? false,
      updatedByUserId: params.userId,
    },
    update: {
      ...(params.enabledRoles !== undefined ? { enabledRoles: roles } : {}),
      ...(params.dailyRequestLimit !== undefined
        ? { dailyRequestLimit: params.dailyRequestLimit }
        : {}),
      ...(params.monthlyRequestLimit !== undefined
        ? { monthlyRequestLimit: params.monthlyRequestLimit }
        : {}),
      ...(params.monthlyCostLimitSar !== undefined
        ? { monthlyCostLimitSar: params.monthlyCostLimitSar }
        : {}),
      ...(params.servicePaused !== undefined ? { servicePaused: params.servicePaused } : {}),
      updatedByUserId: params.userId,
    },
  });
}
