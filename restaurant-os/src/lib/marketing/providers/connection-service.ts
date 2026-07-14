import prisma from "@/lib/prisma";
import { canEncryptTokens } from "@/lib/marketing/encryption";
import {
  getProviderDef,
  getProvidersByCategory,
  isDeveloperEnvConfigured,
  maskAccountId,
  type ProviderCategory,
  type ProviderDefinition,
} from "@/lib/marketing/providers/catalog";
import { encryptApiKey, testProviderConnection } from "@/lib/marketing/providers/test-connection";
import { logProviderAudit } from "@/lib/marketing/providers/permissions";
import type { MarketingPlatform, MarketingProviderCategory } from "@prisma/client";

type ConnRow = {
  id: string;
  providerKey: string;
  category: string;
  status: string;
  connectionMethod: string | null;
  modelId: string | null;
  orgId: string | null;
  projectId: string | null;
  endpointUrl: string | null;
  isDefault: boolean;
  isBackup: boolean;
  roleAssignment: string | null;
  taskAssignment: string | null;
  accountName: string | null;
  accountIdMasked: string | null;
  lastSuccessAt: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
  lastSyncAt: Date | null;
  permissionsJson: unknown;
  usageEstimateJson: unknown;
  costEstimateJson: unknown;
  hasSecret: boolean;
};

const mem = new Map<string, ConnRow & { apiKeyEnc?: string }>();

function memKey(restaurantId: string, category: string, providerKey: string) {
  return `${restaurantId}:${category}:${providerKey}`;
}

function toDbCategory(category: ProviderCategory): MarketingProviderCategory {
  if (category === "ADS") {
    throw new Error("Ad platform connections use marketing_ad_connections");
  }
  return category;
}

async function findConnections(restaurantId: string, category?: ProviderCategory) {
  const prismaCategory = category && category !== "ADS" ? toDbCategory(category) : undefined;
  try {
    const rows = await prisma.marketingAiProviderConnection.findMany({
      where: { restaurantId, ...(prismaCategory ? { category: prismaCategory } : {}) },
    });
    return rows.map((r) => ({
      ...r,
      hasSecret: Boolean(r.apiKeyEnc || r.accessTokenEnc),
    }));
  } catch {
    return [...mem.values()].filter(
      (r) => r.id.startsWith(restaurantId) && (!category || r.category === category)
    );
  }
}

function toPublicRow(
  def: ProviderDefinition,
  row: Partial<ConnRow> | undefined,
  developerReady: boolean
) {
  const status = row?.status ?? "DISCONNECTED";
  return {
    key: def.key,
    nameAr: def.nameAr,
    nameEn: def.nameEn,
    category: def.category,
    oauthSupported: def.oauthSupported,
    apiKeySupported: def.apiKeySupported,
    requiresOrgId: def.requiresOrgId,
    requiresProjectId: def.requiresProjectId,
    requiresEndpoint: def.requiresEndpoint,
    models: def.models ?? [],
    meta: def.meta ?? {},
    developerReady,
    developerSetupRequired: def.developerSetupRequired && !developerReady,
    status,
    connectionMethod: row?.connectionMethod ?? null,
    modelId: row?.modelId ?? def.models?.[0]?.id ?? null,
    orgId: row?.orgId ?? null,
    projectId: row?.projectId ?? null,
    endpointUrl: row?.endpointUrl ?? null,
    isDefault: row?.isDefault ?? false,
    isBackup: row?.isBackup ?? false,
    roleAssignment: row?.roleAssignment ?? null,
    taskAssignment: row?.taskAssignment ?? null,
    accountName: row?.accountName ?? null,
    accountIdMasked: row?.accountIdMasked ?? null,
    lastSuccessAt: row?.lastSuccessAt ?? null,
    lastError: row?.lastError ?? null,
    lastErrorAt: row?.lastErrorAt ?? null,
    lastSyncAt: row?.lastSyncAt ?? null,
    hasSecret: row?.hasSecret ?? false,
    costEstimate: def.costEstimate ?? null,
    usageEstimate: def.usageEstimate ?? null,
  };
}

export async function listProvidersForCategory(restaurantId: string, category: ProviderCategory) {
  const defs = getProvidersByCategory(category);
  const rows = await findConnections(restaurantId, category);
  const byKey = new Map(rows.map((r) => [r.providerKey, r]));
  return defs.map((def) =>
    toPublicRow(def, byKey.get(def.key), isDeveloperEnvConfigured(def))
  );
}

export async function connectWithApiKey(
  restaurantId: string,
  userId: string,
  category: ProviderCategory,
  providerKey: string,
  payload: {
    apiKey: string;
    orgId?: string;
    projectId?: string;
    endpointUrl?: string;
    modelId?: string;
    roleAssignment?: string;
    taskAssignment?: string;
  }
) {
  const def = getProviderDef(category, providerKey);
  if (!def) throw new Error("Unknown provider");
  if (!def.apiKeySupported) throw new Error("API Key not supported for this provider");
  if (!canEncryptTokens()) throw new Error("MARKETING_TOKEN_SECRET غير مُعدّ");

  const test = await testProviderConnection(providerKey, payload.apiKey, payload.endpointUrl);
  if (!test.ok) {
    await upsertConnection(restaurantId, category, providerKey, {
      status: "INVALID_KEY",
      lastError: test.error,
      lastErrorAt: new Date(),
      connectedByUserId: userId,
    });
    throw new Error(test.error ?? "Invalid key");
  }

  const enc = encryptApiKey(payload.apiKey);
  await upsertConnection(restaurantId, category, providerKey, {
    connectionMethod: "API_KEY",
    apiKeyEnc: enc,
    orgId: payload.orgId,
    projectId: payload.projectId,
    endpointUrl: payload.endpointUrl,
    modelId: payload.modelId ?? def.models?.[0]?.id,
    roleAssignment: payload.roleAssignment,
    taskAssignment: payload.taskAssignment,
    status: "HEALTHY",
    lastSuccessAt: new Date(),
    lastError: null,
    lastErrorAt: null,
    connectedByUserId: userId,
  });

  await logProviderAudit(restaurantId, userId, "PROVIDER_CONNECT", category, providerKey, {
    method: "API_KEY",
  });

  return { ok: true, status: "HEALTHY" };
}

async function upsertConnection(
  restaurantId: string,
  category: ProviderCategory,
  providerKey: string,
  data: Record<string, unknown>
) {
  const key = memKey(restaurantId, category, providerKey);
  try {
    const dbCategory = toDbCategory(category);
    await prisma.marketingAiProviderConnection.upsert({
      where: {
        restaurantId_category_providerKey: { restaurantId, category: dbCategory, providerKey },
      },
      create: {
        restaurantId,
        category: dbCategory,
        providerKey,
        ...(data as object),
      },
      update: data as object,
    });
  } catch {
    const existing = mem.get(key);
    mem.set(key, {
      id: existing?.id ?? `mem-${key}`,
      providerKey,
      category,
      status: "DISCONNECTED",
      connectionMethod: null,
      modelId: null,
      orgId: null,
      projectId: null,
      endpointUrl: null,
      isDefault: false,
      isBackup: false,
      roleAssignment: null,
      taskAssignment: null,
      accountName: null,
      accountIdMasked: null,
      lastSuccessAt: null,
      lastError: null,
      lastErrorAt: null,
      lastSyncAt: null,
      permissionsJson: null,
      usageEstimateJson: null,
      costEstimateJson: null,
      hasSecret: false,
      ...existing,
      ...data,
    } as ConnRow & { apiKeyEnc?: string });
  }
}

export async function disconnectProvider(
  restaurantId: string,
  userId: string,
  category: ProviderCategory,
  providerKey: string
) {
  try {
    const dbCategory = toDbCategory(category);
    await prisma.marketingAiProviderConnection.updateMany({
      where: { restaurantId, category: dbCategory, providerKey },
      data: {
        status: "DISCONNECTED",
        apiKeyEnc: null,
        accessTokenEnc: null,
        refreshTokenEnc: null,
        isDefault: false,
        isBackup: false,
      },
    });
  } catch {
    mem.delete(memKey(restaurantId, category, providerKey));
  }
  await logProviderAudit(restaurantId, userId, "PROVIDER_DISCONNECT", category, providerKey);
}

export async function setProviderFlags(
  restaurantId: string,
  userId: string,
  category: ProviderCategory,
  providerKey: string,
  flags: { isDefault?: boolean; isBackup?: boolean; modelId?: string; roleAssignment?: string; taskAssignment?: string }
) {
  if (flags.isDefault) {
    try {
      const dbCategory = toDbCategory(category);
      await prisma.marketingAiProviderConnection.updateMany({
        where: { restaurantId, category: dbCategory },
        data: { isDefault: false },
      });
    } catch {
      mem.forEach((v, k) => {
        if (k.startsWith(`${restaurantId}:${category}:`)) v.isDefault = false;
      });
    }
  }
  await upsertConnection(restaurantId, category, providerKey, flags);
  await logProviderAudit(restaurantId, userId, "PROVIDER_UPDATE", category, providerKey, flags);
}

export async function testStoredConnection(
  restaurantId: string,
  category: ProviderCategory,
  providerKey: string
) {
  let apiKeyEnc: string | null = null;
  let endpointUrl: string | null = null;
  try {
    const dbCategory = toDbCategory(category);
    const row = await prisma.marketingAiProviderConnection.findUnique({
      where: { restaurantId_category_providerKey: { restaurantId, category: dbCategory, providerKey } },
    });
    apiKeyEnc = row?.apiKeyEnc ?? null;
    endpointUrl = row?.endpointUrl ?? null;
  } catch {
    const row = mem.get(memKey(restaurantId, category, providerKey));
    apiKeyEnc = row?.apiKeyEnc ?? null;
    endpointUrl = row?.endpointUrl ?? null;
  }
  if (!apiKeyEnc) return { ok: false, error: "لا يوجد مفتاح محفوظ" };

  const { decryptApiKey } = await import("@/lib/marketing/providers/test-connection");
  const test = await testProviderConnection(providerKey, decryptApiKey(apiKeyEnc), endpointUrl ?? undefined);
  await upsertConnection(restaurantId, category, providerKey, {
    status: test.ok ? "HEALTHY" : "INVALID_KEY",
    lastSuccessAt: test.ok ? new Date() : undefined,
    lastError: test.error ?? null,
    lastErrorAt: test.ok ? null : new Date(),
  });
  return test;
}

export async function getAdPlatformConnections(restaurantId: string) {
  let adConnections: Array<{
    platform: string;
    accountName: string | null;
    accountId: string | null;
    isActive: boolean;
    connectedAt: Date | null;
    scopes: string[];
    tokenExpiresAt: Date | null;
  }> = [];
  try {
    adConnections = await prisma.marketingAdConnection.findMany({
      where: { restaurantId },
      select: {
        platform: true,
        accountName: true,
        accountId: true,
        isActive: true,
        connectedAt: true,
        scopes: true,
        tokenExpiresAt: true,
      },
    });
  } catch {
    /* empty */
  }

  const { ADS_PLATFORMS } = await import("@/lib/marketing/providers/catalog");
  const { isAdsIntegrationReady } = await import("@/lib/platform/ads-integrations");
  const { platformToIntegrationKey } = await import("@/lib/marketing/ads-oauth");

  return Promise.all(
    ADS_PLATFORMS.map(async (p) => {
      const conn = adConnections.find((c) => c.platform === p.key);
      const integrationKey = platformToIntegrationKey(p.key as MarketingPlatform);
      const oauthReady = integrationKey ? await isAdsIntegrationReady(integrationKey) : false;
      return {
        key: p.key,
        labelAr: p.labelAr,
        oauthSupported: p.oauthSupported,
        integrationReady: oauthReady,
        status: conn?.isActive ? "CONNECTED" : "DISCONNECTED",
        accountName: conn?.accountName ?? null,
        accountIdMasked: maskAccountId(conn?.accountId),
        lastSyncAt: conn?.connectedAt ?? null,
      };
    })
  );
}

export async function getRouting(restaurantId: string) {
  try {
    const row = await prisma.marketingProviderRouting.findUnique({ where: { restaurantId } });
    return row?.rulesJson ?? defaultRouting();
  } catch {
    return defaultRouting();
  }
}

function defaultRouting() {
  return {
    primary: { BRAIN: "OPENAI", IMAGE: "OPENAI_IMAGES", VIDEO: "RUNWAY", AUDIO: "ELEVENLABS" },
    backup: { BRAIN: "DEEPSEEK", IMAGE: "IDEOGRAM", VIDEO: "KLING", AUDIO: "OPENAI_AUDIO" },
    cheapest: { BRAIN: "DEEPSEEK", IMAGE: "STABILITY", VIDEO: "REPLICATE_VIDEO", AUDIO: "OPENAI_AUDIO" },
    fastest: { BRAIN: "GEMINI", IMAGE: "OPENAI_IMAGES", VIDEO: "PIKA", AUDIO: "ELEVENLABS" },
    quality: { BRAIN: "CLAUDE", IMAGE: "IDEOGRAM", VIDEO: "RUNWAY", AUDIO: "ELEVENLABS" },
    rules: [
      { task: "ad_copy", provider: "OPENAI" },
      { task: "analytics", provider: "GEMINI" },
      { task: "campaign_plans", provider: "CLAUDE" },
      { task: "arabic_poster", provider: "IDEOGRAM" },
      { task: "short_video", provider: "RUNWAY" },
      { task: "premium_video", provider: "KLING" },
    ],
    autoSelect: false,
    failoverToBackup: true,
    stopIfCostExceedsLimit: true,
  };
}

export async function saveRouting(restaurantId: string, userId: string, rulesJson: object) {
  try {
    await prisma.marketingProviderRouting.upsert({
      where: { restaurantId },
      create: { restaurantId, rulesJson, createdBy: userId },
      update: { rulesJson, createdBy: userId },
    });
  } catch {
    /* memory noop */
  }
  await logProviderAudit(restaurantId, userId, "ROUTING_UPDATE", "ROUTING", restaurantId, rulesJson as Record<string, unknown>);
}

export async function getCostSettings(restaurantId: string) {
  try {
    const row = await prisma.marketingAiCostSettings.findUnique({ where: { restaurantId } });
    if (row) {
      return {
        dailyBudget: Number(row.dailyBudget),
        monthlyBudget: Number(row.monthlyBudget),
        maxCostPerImage: row.maxCostPerImage ? Number(row.maxCostPerImage) : null,
        maxCostPerVideo: row.maxCostPerVideo ? Number(row.maxCostPerVideo) : null,
        maxDailyAiCost: row.maxDailyAiCost ? Number(row.maxDailyAiCost) : null,
        maxMonthlyAiCost: row.maxMonthlyAiCost ? Number(row.maxMonthlyAiCost) : null,
        requireApprovalAbove: row.requireApprovalAbove ? Number(row.requireApprovalAbove) : null,
        hardSpendingLimit: row.hardSpendingLimit ? Number(row.hardSpendingLimit) : null,
        alertsEnabled: row.alertsEnabled,
      };
    }
  } catch {
    /* fallback */
  }
  return {
    dailyBudget: 50,
    monthlyBudget: 500,
    maxCostPerImage: 2,
    maxCostPerVideo: 15,
    maxDailyAiCost: 50,
    maxMonthlyAiCost: 500,
    requireApprovalAbove: 10,
    hardSpendingLimit: 1000,
    alertsEnabled: true,
  };
}

export async function saveCostSettings(restaurantId: string, userId: string, data: Record<string, number | boolean>) {
  try {
    await prisma.marketingAiCostSettings.upsert({
      where: { restaurantId },
      create: { restaurantId, ...data, createdBy: userId },
      update: { ...data, createdBy: userId },
    });
  } catch {
    /* noop */
  }
  await logProviderAudit(restaurantId, userId, "COST_SETTINGS_UPDATE", "COSTS", restaurantId, data);
}

export async function getCostSummary(restaurantId: string) {
  const settings = await getCostSettings(restaurantId);
  let usage: Array<{ providerKey: string; category: string; costAmount: unknown }> = [];
  try {
    const start = new Date();
    start.setDate(1);
    usage = await prisma.marketingAiUsageLog.findMany({
      where: { restaurantId, createdAt: { gte: start } },
      select: { providerKey: true, category: true, costAmount: true },
    });
  } catch {
    usage = [];
  }
  const monthSpent = usage.reduce((s, u) => s + Number(u.costAmount), 0);
  const byProvider: Record<string, number> = {};
  usage.forEach((u) => {
    byProvider[u.providerKey] = (byProvider[u.providerKey] ?? 0) + Number(u.costAmount);
  });
  return {
    settings,
    monthSpent,
    remaining: Math.max(0, settings.monthlyBudget - monthSpent),
    byProvider,
    byCategory: {} as Record<string, number>,
    alerts: monthSpent >= settings.monthlyBudget * 0.8 ? ["اقتراب من حد الميزانية الشهرية"] : [],
  };
}

export async function runWizardTest(restaurantId: string) {
  const categories: ProviderCategory[] = ["BRAIN", "IMAGE", "VIDEO", "AUDIO"];
  const results = [];
  for (const cat of categories) {
    const providers = await listProvidersForCategory(restaurantId, cat);
    const connected = providers.filter((p) => p.status === "HEALTHY" || p.status === "CONNECTED");
    const defaultP = providers.find((p) => p.isDefault);
    results.push({
      category: cat,
      connected: connected.length,
      total: providers.length,
      hasDefault: Boolean(defaultP),
      missing: providers.filter((p) => p.developerSetupRequired).map((p) => p.key),
    });
  }
  const ads = await getAdPlatformConnections(restaurantId);
  return {
    services: results,
    ads: { connected: ads.filter((a) => a.status === "CONNECTED").length, total: ads.length },
    failed: results.flatMap((r) => r.missing),
    recommendation: "OpenAI + Ideogram + Runway + ElevenLabs كإعداد افتراضي مقترح",
  };
}

export async function checkCostAllowed(restaurantId: string, estimatedCost: number, type: "image" | "video" | "chat") {
  const settings = await getCostSettings(restaurantId);
  const summary = await getCostSummary(restaurantId);
  if (estimatedCost > Number(settings.hardSpendingLimit ?? Infinity)) {
    return { allowed: false, reason: "تجاوز الحد الأقصى للإنفاق" };
  }
  if (summary.monthSpent + estimatedCost > settings.monthlyBudget) {
    return { allowed: false, reason: "تجاوز الميزانية الشهرية" };
  }
  if (type === "image" && settings.maxCostPerImage && estimatedCost > Number(settings.maxCostPerImage)) {
    return { allowed: false, reason: "تجاوز حد تكلفة الصورة" };
  }
  if (type === "video" && settings.maxCostPerVideo && estimatedCost > Number(settings.maxCostPerVideo)) {
    return { allowed: false, reason: "تجاوز حد تكلفة الفيديو" };
  }
  return { allowed: true };
}

export async function resolveProviderWithFailover(
  restaurantId: string,
  category: ProviderCategory,
  task?: string
) {
  const routing = (await getRouting(restaurantId)) as {
    primary: Record<string, string>;
    backup: Record<string, string>;
    rules?: Array<{ task: string; provider: string }>;
    failoverToBackup?: boolean;
  };
  if (task && routing.rules) {
    const rule = routing.rules.find((r) => r.task === task);
    if (rule) {
      const providers = await listProvidersForCategory(restaurantId, category);
      const match = providers.find((p) => p.key === rule.provider && p.status === "HEALTHY");
      if (match) return match.key;
    }
  }
  const primaryKey = routing.primary[category];
  const providers = await listProvidersForCategory(restaurantId, category);
  const primary = providers.find((p) => p.key === primaryKey && (p.status === "HEALTHY" || p.hasSecret));
  if (primary) return primary.key;
  if (routing.failoverToBackup) {
    const backupKey = routing.backup[category];
    const backup = providers.find((p) => p.key === backupKey);
    if (backup?.hasSecret) return backup.key;
  }
  return providers.find((p) => p.isDefault && p.hasSecret)?.key ?? null;
}
