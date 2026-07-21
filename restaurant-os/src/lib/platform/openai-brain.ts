import prisma from "@/lib/prisma";
import { canEncryptTokens } from "@/lib/marketing/encryption";
import { decryptApiKey } from "@/lib/marketing/providers/test-connection";
import {
  PLATFORM_BRAIN_PROVIDERS,
  PLATFORM_BRAIN_ROLES,
  type PlatformBrainRoleId,
} from "@/lib/platform/ai-providers-constants";

export type PlatformOpenAiResolveResult =
  | { ok: true; apiKey: string; modelId: string }
  | { ok: false; message: string; code: "NOT_CONNECTED" | "ROLE_DISABLED" | "MISSING_KEY" | "CONFIG" };

export const OPENAI_BRAIN_DISCONNECTED_MSG =
  "مزود OpenAI غير متصل في AI Brain — افتح Marketing Brain → AI Brain وفعّل OpenAI ثم اختبر الاتصال.";

export function roleDisabledMessage(roleId: PlatformBrainRoleId): string {
  const label = PLATFORM_BRAIN_ROLES.find((r) => r.id === roleId)?.labelAr ?? roleId;
  return `خدمة «${label}» غير مفعّلة في AI Brain — فعّل المهمة من إعدادات OpenAI.`;
}

function isOpenAiConnected(status: string, lastSuccessAt: Date | null): boolean {
  if (status === "HEALTHY") return true;
  if (status === "CONNECTED" && lastSuccessAt) return true;
  return false;
}

/** Single source: encrypted OpenAI key + model from platform_ai_provider_connections. */
export async function resolvePlatformOpenAiForRole(
  roleId: PlatformBrainRoleId
): Promise<PlatformOpenAiResolveResult> {
  if (!canEncryptTokens()) {
    return {
      ok: false,
      message: "إعداد التشفير غير مكتمل — لا يمكن قراءة مزود OpenAI.",
      code: "CONFIG",
    };
  }

  const row = await prisma.platformAiProviderConnection.findUnique({
    where: { providerKey: "OPENAI" },
  });

  if (!row?.apiKeyEnc) {
    return { ok: false, message: OPENAI_BRAIN_DISCONNECTED_MSG, code: "MISSING_KEY" };
  }

  const roles = (row.roleAssignments as string[] | null) ?? [];
  if (!roles.includes(roleId)) {
    return { ok: false, message: roleDisabledMessage(roleId), code: "ROLE_DISABLED" };
  }

  if (!isOpenAiConnected(row.status, row.lastSuccessAt)) {
    return { ok: false, message: OPENAI_BRAIN_DISCONNECTED_MSG, code: "NOT_CONNECTED" };
  }

  const modelId = row.modelId?.trim() || PLATFORM_BRAIN_PROVIDERS.OPENAI.defaultModel;

  try {
    const apiKey = decryptApiKey(row.apiKeyEnc);
    if (!apiKey.trim()) {
      return { ok: false, message: OPENAI_BRAIN_DISCONNECTED_MSG, code: "MISSING_KEY" };
    }
    return { ok: true, apiKey, modelId };
  } catch {
    return {
      ok: false,
      message: "تعذر قراءة مزود OpenAI — أعد حفظ المفتاح من AI Brain.",
      code: "CONFIG",
    };
  }
}

/** Read-only status for dashboards — never exposes apiKey. */
export async function getPlatformOpenAiPublicStatus(roleId?: PlatformBrainRoleId) {
  const row = await prisma.platformAiProviderConnection.findUnique({
    where: { providerKey: "OPENAI" },
  });
  const roles = (row?.roleAssignments as string[] | null) ?? [];
  const connected = Boolean(row?.apiKeyEnc && isOpenAiConnected(row.status, row.lastSuccessAt ?? null));

  return {
    connected,
    modelId: row?.modelId ?? PLATFORM_BRAIN_PROVIDERS.OPENAI.defaultModel,
    status: row?.status ?? "DISCONNECTED",
    roleEnabled: roleId ? roles.includes(roleId) : undefined,
    lastSuccessAt: row?.lastSuccessAt?.toISOString() ?? null,
  };
}
