import prisma from "@/lib/prisma";
import { canEncryptTokens } from "@/lib/marketing/encryption";
import {
  encryptApiKey,
  decryptApiKey,
  testProviderConnection,
  testOpenAiResponses,
  type ProviderTestResult,
} from "@/lib/marketing/providers/test-connection";
import { logPlatformAudit } from "@/lib/platform-audit";
import {
  PLATFORM_BRAIN_PROVIDER_KEYS,
  PLATFORM_BRAIN_PROVIDERS,
  type PlatformBrainProviderKey,
} from "@/lib/platform/ai-providers-constants";

export type { PlatformBrainProviderKey };
export { PLATFORM_BRAIN_PROVIDER_KEYS, PLATFORM_BRAIN_ROLES } from "@/lib/platform/ai-providers-constants";

export type ProviderCardStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "needs_test"
  | "missing_key";

function toCardStatus(row: {
  apiKeyEnc: string | null;
  status: string;
  lastSuccessAt: Date | null;
}): ProviderCardStatus {
  if (!row.apiKeyEnc) return "missing_key";
  if (row.status === "INVALID_KEY" || row.status === "EXPIRED") return "error";
  if (row.status === "HEALTHY" || row.status === "CONNECTED") {
    return row.lastSuccessAt ? "connected" : "needs_test";
  }
  if (row.status === "NEEDS_RECONNECT") return "needs_test";
  return "disconnected";
}

function statusLabelAr(card: ProviderCardStatus, dbStatus: string): string {
  if (card === "connected") return "متصل";
  if (card === "missing_key") return "المفتاح مفقود";
  if (card === "error") return dbStatus === "INVALID_KEY" ? "المفتاح غير صالح" : "خطأ";
  if (card === "needs_test") return "يحتاج اختبار";
  return "غير متصل";
}

export async function listPlatformAiProviderStatus() {
  const rows = await prisma.platformAiProviderConnection.findMany();
  const byKey = new Map(rows.map((r) => [r.providerKey, r]));

  return PLATFORM_BRAIN_PROVIDER_KEYS.map((key) => {
    const def = PLATFORM_BRAIN_PROVIDERS[key];
    const row = byKey.get(key);
    const cardStatus = row
      ? toCardStatus(row)
      : ("missing_key" as ProviderCardStatus);
    return {
      key,
      nameAr: def.nameAr,
      models: def.models,
      defaultModel: def.defaultModel,
      keyCreateUrl: def.keyCreateUrl,
      modelId: row?.modelId ?? def.defaultModel,
      status: row?.status ?? "DISCONNECTED",
      cardStatus,
      statusLabelAr: statusLabelAr(cardStatus, row?.status ?? "DISCONNECTED"),
      hasSecret: Boolean(row?.apiKeyEnc),
      lastTestAt: row?.lastTestAt?.toISOString() ?? null,
      lastSuccessAt: row?.lastSuccessAt?.toISOString() ?? null,
      lastError: row?.lastError ?? null,
      roleAssignments: (row?.roleAssignments as string[] | null) ?? [],
    };
  });
}

async function runTest(
  providerKey: PlatformBrainProviderKey,
  apiKey: string,
  modelId?: string
): Promise<ProviderTestResult> {
  if (providerKey === "OPENAI") {
    return testOpenAiResponses(apiKey, modelId ?? "gpt-4o-mini");
  }
  const result = await testProviderConnection(providerKey, apiKey);
  return {
    ok: result.ok,
    error: result.error,
    isInvalidKey: result.error?.includes("غير صالح") || result.error?.includes("Invalid API key"),
  };
}

function failureStatus(test: { isInvalidKey?: boolean }): "INVALID_KEY" | "NEEDS_RECONNECT" {
  return test.isInvalidKey ? "INVALID_KEY" : "NEEDS_RECONNECT";
}

export async function connectPlatformAiProvider(params: {
  providerKey: PlatformBrainProviderKey;
  apiKey: string;
  modelId?: string;
  roleAssignments?: string[];
  userId: string;
  testAfterSave?: boolean;
}) {
  if (!PLATFORM_BRAIN_PROVIDER_KEYS.includes(params.providerKey)) {
    throw new Error("مزوّد غير مدعوم");
  }
  if (!canEncryptTokens()) {
    throw new Error("MARKETING_TOKEN_SECRET غير مُعدّ — لا يمكن حفظ المفاتيح");
  }

  const existing = await prisma.platformAiProviderConnection.findUnique({
    where: { providerKey: params.providerKey },
  });

  const def = PLATFORM_BRAIN_PROVIDERS[params.providerKey];
  const modelId = params.modelId?.trim() || existing?.modelId || def.defaultModel;
  if (!modelId) throw new Error("يجب اختيار موديل");

  const roleAssignments =
    params.roleAssignments !== undefined
      ? params.roleAssignments
      : (existing?.roleAssignments as string[] | null) ?? [];
  if (!roleAssignments.length) {
    throw new Error("يجب تحديد مهمة واحدة على الأقل");
  }

  const keepExisting = params.apiKey === "KEEP" || !params.apiKey.trim();

  let key = params.apiKey?.trim();
  if (keepExisting) {
    if (!existing?.apiKeyEnc) throw new Error("API Key مطلوب");
    key = decryptApiKey(existing.apiKeyEnc);
  }

  if (!key) throw new Error("API Key مطلوب");

  if (keepExisting && params.testAfterSave === false) {
    await prisma.platformAiProviderConnection.update({
      where: { providerKey: params.providerKey },
      data: {
        modelId,
        roleAssignments,
      },
    });
    const cardStatus = existing
      ? toCardStatus({ ...existing, apiKeyEnc: existing.apiKeyEnc, lastSuccessAt: existing.lastSuccessAt })
      : ("missing_key" as ProviderCardStatus);
    return {
      ok: true,
      status: existing?.status ?? "CONNECTED",
      modelId,
      roleAssignments,
      statusLabelAr: statusLabelAr(cardStatus, existing?.status ?? "CONNECTED"),
    };
  }

  let status: "CONNECTED" | "HEALTHY" | "INVALID_KEY" | "NEEDS_RECONNECT" = "CONNECTED";
  let lastError: string | null = null;
  let lastSuccessAt: Date | null = existing?.lastSuccessAt ?? null;
  let lastTestAt: Date | null = null;

  if (params.testAfterSave !== false) {
    const test = await runTest(params.providerKey, key, modelId);
    lastTestAt = new Date();
    if (!test.ok) {
      status = failureStatus(test);
      lastError = test.error ?? "فشل الاختبار";
    } else {
      status = "HEALTHY";
      lastSuccessAt = new Date();
    }
  }

  const enc = keepExisting ? existing!.apiKeyEnc! : encryptApiKey(key);
  await prisma.platformAiProviderConnection.upsert({
    where: { providerKey: params.providerKey },
    create: {
      providerKey: params.providerKey,
      apiKeyEnc: enc,
      modelId,
      status,
      roleAssignments,
      lastTestAt,
      lastSuccessAt,
      lastError,
      connectedByUserId: params.userId,
    },
    update: {
      ...(keepExisting ? {} : { apiKeyEnc: enc }),
      modelId,
      status,
      roleAssignments,
      lastTestAt,
      lastSuccessAt,
      lastError,
      connectedByUserId: params.userId,
    },
  });

  await logPlatformAudit({
    userId: params.userId,
    action: "PLATFORM_AI_PROVIDER_CONNECT",
    entity: "PlatformAiProvider",
    entityId: params.providerKey,
    metadata: { modelId, status, tested: params.testAfterSave !== false, keepExisting },
  });

  if (status === "INVALID_KEY") {
    throw new Error(lastError ?? "المفتاح غير صالح");
  }
  if (lastError && params.testAfterSave !== false && status !== "HEALTHY") {
    throw new Error(lastError);
  }

  const cardStatus = toCardStatus({
    apiKeyEnc: enc,
    status,
    lastSuccessAt,
  });

  return {
    ok: true,
    status,
    modelId,
    roleAssignments,
    statusLabelAr: statusLabelAr(cardStatus, status),
  };
}

export async function testPlatformAiProvider(params: {
  providerKey: PlatformBrainProviderKey;
  userId: string;
  apiKey?: string;
}) {
  const row = await prisma.platformAiProviderConnection.findUnique({
    where: { providerKey: params.providerKey },
  });

  let apiKey = params.apiKey?.trim();
  if (!apiKey) {
    if (!row?.apiKeyEnc) throw new Error("المفتاح مفقود");
    apiKey = decryptApiKey(row.apiKeyEnc);
  }

  const modelId = row?.modelId ?? PLATFORM_BRAIN_PROVIDERS[params.providerKey].defaultModel;
  const test = await runTest(params.providerKey, apiKey, modelId);
  const now = new Date();
  const failStatus = test.ok ? "HEALTHY" : failureStatus(test);

  await prisma.platformAiProviderConnection.upsert({
    where: { providerKey: params.providerKey },
    create: {
      providerKey: params.providerKey,
      apiKeyEnc: row?.apiKeyEnc ?? (params.apiKey ? encryptApiKey(params.apiKey) : null),
      modelId,
      status: failStatus,
      lastTestAt: now,
      lastSuccessAt: test.ok ? now : null,
      lastError: test.ok ? null : test.error ?? "فشل",
      connectedByUserId: params.userId,
    },
    update: {
      status: failStatus,
      lastTestAt: now,
      lastSuccessAt: test.ok ? now : row?.lastSuccessAt ?? null,
      lastError: test.ok ? null : test.error ?? "فشل",
    },
  });

  await logPlatformAudit({
    userId: params.userId,
    action: "PLATFORM_AI_PROVIDER_TEST",
    entity: "PlatformAiProvider",
    entityId: params.providerKey,
    metadata: { ok: test.ok },
  });

  const modelLabel =
    PLATFORM_BRAIN_PROVIDERS[params.providerKey].models.find((m) => m.id === modelId)?.labelAr ||
    modelId;

  return {
    ok: test.ok,
    error: test.error,
    testedAt: now.toISOString(),
    modelId,
    modelLabelAr: modelLabel,
    statusLabelAr: test.ok ? "متصل" : undefined,
    keyValid: test.ok,
    lastTestLabelAr: test.ok ? "ناجح" : "فاشل",
    roleAssignments: (row?.roleAssignments as string[] | null) ?? [],
  };
}

export async function disconnectPlatformAiProvider(params: {
  providerKey: PlatformBrainProviderKey;
  userId: string;
}) {
  await prisma.platformAiProviderConnection.updateMany({
    where: { providerKey: params.providerKey },
    data: {
      apiKeyEnc: null,
      status: "DISCONNECTED",
      lastError: null,
      lastSuccessAt: null,
      lastTestAt: null,
      roleAssignments: [],
    },
  });

  await logPlatformAudit({
    userId: params.userId,
    action: "PLATFORM_AI_PROVIDER_DISCONNECT",
    entity: "PlatformAiProvider",
    entityId: params.providerKey,
  });

  return { ok: true };
}
