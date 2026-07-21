import { callPlatformOpenAiText } from "@/lib/openai/responses-client";
import { resolvePlatformOpenAiForRole } from "@/lib/platform/openai-brain";
import {
  AI_ENGINEER_PERMISSIONS,
  getPermissionDef,
} from "@/lib/ai-engineer/permission-catalog";
import { validateAndExecute } from "@/lib/ai-engineer/permission-service";

const ALLOWED_KEYS = AI_ENGINEER_PERMISSIONS.filter((p) => !p.blocked).map((p) => p.key);

const ENGINEER_INSTRUCTIONS = `أنت «مهندس المنصة الذكي» — تفهم أوامر صيانة المنصة بالعربية.
- حوّل الأمر إلى permissionKey واحد من القائمة فقط.
- لا تقترح SQL أو Terminal أو نشر Production مباشرة.
- للفحص والقراءة استخدم مفاتيح read_*.
- «فحص واتساب» أو «حالة واتساب» → read_whatsapp_status
- «حالة OpenAI» → read_openai_status
- «صحة المنصة» → read_platform_health
أرجع JSON فقط: {"permissionKey":"...","summaryAr":"..."}`;

function permissionCatalogForPrompt(): string {
  return AI_ENGINEER_PERMISSIONS.filter((p) => !p.blocked)
    .map((p) => `- ${p.key}: ${p.nameAr}`)
    .join("\n");
}

function fallbackParse(message: string): { permissionKey: string; summaryAr: string } | null {
  const t = message.toLowerCase();
  if (/واتساب|whatsapp/.test(t) && /فحص|حالة|متصل|اتصال/.test(t)) {
    return {
      permissionKey: "read_whatsapp_status",
      summaryAr: "فحص حالة اتصال WhatsApp Business",
    };
  }
  if (/openai|ذكاء|ai brain/.test(t)) {
    return { permissionKey: "read_openai_status", summaryAr: "قراءة حالة OpenAI" };
  }
  if (/صحة|health|منصة/.test(t)) {
    return { permissionKey: "read_platform_health", summaryAr: "فحص صحة المنصة" };
  }
  return null;
}

function parseModelJson(text: string): { permissionKey: string; summaryAr: string } | null {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { permissionKey?: string; summaryAr?: string };
    const key = String(parsed.permissionKey || "").trim();
    if (!ALLOWED_KEYS.includes(key)) return null;
    return {
      permissionKey: key,
      summaryAr: String(parsed.summaryAr || getPermissionDef(key)?.nameAr || key),
    };
  } catch {
    return null;
  }
}

export async function processEngineerChatCommand(params: {
  message: string;
  actorId: string;
}) {
  const brain = await resolvePlatformOpenAiForRole("PLATFORM_ENGINEER");
  if (!brain.ok) {
    return { ok: false as const, message: brain.message };
  }

  const ai = await callPlatformOpenAiText({
    role: "PLATFORM_ENGINEER",
    logTag: "platform-engineer",
    instructions: `${ENGINEER_INSTRUCTIONS}\n\nالصلاحيات المتاحة:\n${permissionCatalogForPrompt()}`,
    userMessage: params.message,
    maxOutputTokens: 256,
  });

  const parsed =
    (ai.ok ? parseModelJson(ai.text) : null) ?? fallbackParse(params.message);

  if (!parsed) {
    return {
      ok: false as const,
      message: "لم أفهم الأمر. جرّب: «فحص حالة واتساب» أو «ما حالة OpenAI؟»",
    };
  }

  const def = getPermissionDef(parsed.permissionKey);
  if (!def) {
    return { ok: false as const, message: "صلاحية غير معروفة" };
  }

  const blocked = ["run_sql", "run_terminal", "deploy_production", "rollback"].some((k) =>
    parsed.permissionKey.includes(k)
  );
  if (blocked || def.blocked) {
    return {
      ok: true as const,
      understood: true,
      permissionKey: parsed.permissionKey,
      summaryAr: parsed.summaryAr,
      message: `${parsed.summaryAr}\n\n⚠️ هذا الإجراء محظور أو يتطلب موافقة صريحة — لا يمكن التنفيذ التلقائي.`,
      executed: false,
      requiresApproval: true,
    };
  }

  const exec = await validateAndExecute({
    permissionKey: parsed.permissionKey,
    payload: { source: "ai-engineer-chat", command: params.message.slice(0, 200) },
    actorId: params.actorId,
  });

  if (exec.ok) {
    return {
      ok: true as const,
      understood: true,
      permissionKey: parsed.permissionKey,
      summaryAr: parsed.summaryAr,
      message: `${parsed.summaryAr}\n\n✓ ${exec.result}`,
      executed: true,
      requiresApproval: false,
    };
  }

  return {
    ok: true as const,
    understood: true,
    permissionKey: parsed.permissionKey,
    summaryAr: parsed.summaryAr,
    message: `${parsed.summaryAr}\n\n${exec.error || "يتطلب موافقة قبل التنفيذ."}`,
    executed: false,
    requiresApproval: true,
    code: exec.code,
  };
}
