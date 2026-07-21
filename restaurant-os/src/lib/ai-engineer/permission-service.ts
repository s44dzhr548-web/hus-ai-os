import { randomBytes, createHash } from "crypto";
import prisma from "@/lib/prisma";
import {
  AI_ENGINEER_PERMISSIONS,
  PRESETS,
  type ApprovalType,
  type PresetId,
  getPermissionDef,
  maxAllowedApprovalType,
  hashPayload,
} from "@/lib/ai-engineer/permission-catalog";

export type AuditEventType =
  | "permission_requested"
  | "permission_approved"
  | "permission_denied"
  | "permission_expired"
  | "permission_revoked"
  | "action_executed"
  | "action_failed"
  | "workflow_cancelled"
  | "emergency_stop"
  | "denied_attempt";

const APPROVAL_LABELS: Record<ApprovalType, string> = {
  reject: "رفض",
  once: "موافقة لمرة واحدة",
  "15min": "موافقة لمدة 15 دقيقة",
  session: "موافقة لهذه الجلسة فقط",
  permanent: "موافقة دائمة",
};

export function approvalLabel(type: ApprovalType): string {
  return APPROVAL_LABELS[type];
}

function scopeKey(restaurantScope?: string | null, branchScope?: string | null): {
  restaurantScope: string;
  branchScope: string;
} {
  return {
    restaurantScope: restaurantScope?.trim() || "",
    branchScope: branchScope?.trim() || "",
  };
}

export async function appendAudit(params: {
  eventType: AuditEventType;
  userId?: string | null;
  permissionKey?: string | null;
  scope?: object | null;
  decision?: string | null;
  reason?: string | null;
  result?: string | null;
  metadata?: object | null;
}) {
  await prisma.aiEngineerAuditLog.create({
    data: {
      eventType: params.eventType,
      userId: params.userId ?? null,
      permissionKey: params.permissionKey ?? null,
      scope: params.scope ?? undefined,
      decision: params.decision ?? null,
      reason: params.reason ?? null,
      result: params.result ?? null,
      metadata: params.metadata ?? undefined,
    },
  });
}

export async function getGlobalState() {
  const state = await prisma.aiEngineerGlobalState.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
  return state;
}

export async function ensureSession(userId: string) {
  const state = await getGlobalState();
  if (state.sessionId) return state;

  const sessionId = createHash("sha256")
    .update(`${userId}:${Date.now()}:${randomBytes(8).toString("hex")}`)
    .digest("hex")
    .slice(0, 32);

  return prisma.aiEngineerGlobalState.update({
    where: { id: "singleton" },
    data: {
      sessionId,
      sessionStartedAt: new Date(),
      updatedByUserId: userId,
    },
  });
}

export async function listPermissionsWithState() {
  const [grants, globalState] = await Promise.all([
    prisma.aiEngineerPermissionGrant.findMany(),
    getGlobalState(),
  ]);

  type Grant = (typeof grants)[number];
  const grantMap = new Map<string, Grant>(
    grants.map((g: Grant) => [
      `${g.permissionKey}::${g.restaurantScope ?? ""}::${g.branchScope ?? ""}`,
      g,
    ])
  );

  return AI_ENGINEER_PERMISSIONS.map((def) => {
    const grant = grantMap.get(`${def.key}::::`) ?? null;
    return {
      ...def,
      enabled: grant?.enabled ?? false,
      approvalType: grant?.approvalType ?? null,
      grantedAt: grant?.grantedAt?.toISOString() ?? null,
      expiresAt: grant?.expiresAt?.toISOString() ?? null,
      revokedAt: grant?.revokedAt?.toISOString() ?? null,
      lastUsedAt: grant?.lastUsedAt?.toISOString() ?? null,
      usageCount: grant?.usageCount ?? 0,
      restaurantScope: grant?.restaurantScope ?? null,
      branchScope: grant?.branchScope ?? null,
      dataScope: grant?.dataScope ?? null,
      maxApproval: maxAllowedApprovalType(def),
    };
  });
}

export async function applyPreset(presetId: PresetId, userId: string) {
  const preset = PRESETS[presetId];
  if (!preset) throw new Error("Invalid preset");

  await prisma.aiEngineerPermissionGrant.updateMany({
    data: {
      enabled: false,
      revokedAt: new Date(),
      revokeReason: `تطبيق وضع: ${preset.labelAr}`,
    },
  });

  const allowedKeys = new Set(preset.keys);
  for (const def of AI_ENGINEER_PERMISSIONS) {
    if (def.blocked) continue;
    const enabled = presetId === "custom" ? false : allowedKeys.has(def.key);
    await upsertGrant({
      permissionKey: def.key,
      enabled,
      approvalType: enabled && def.allowPermanent ? "permanent" : null,
      grantedByUserId: userId,
      grantedAt: enabled ? new Date() : null,
      expiresAt: null,
    });
  }

  await prisma.aiEngineerGlobalState.update({
    where: { id: "singleton" },
    data: { activePreset: presetId, updatedByUserId: userId },
  });

  await appendAudit({
    eventType: "permission_approved",
    userId,
    decision: preset.labelAr,
    reason: "تطبيق إعداد مسبق",
    metadata: { presetId },
  });
}

async function upsertGrant(params: {
  permissionKey: string;
  enabled: boolean;
  approvalType?: string | null;
  grantedByUserId?: string | null;
  grantedAt?: Date | null;
  expiresAt?: Date | null;
  restaurantScope?: string | null;
  branchScope?: string | null;
  dataScope?: string | null;
  sessionId?: string | null;
}) {
  const { restaurantScope, branchScope } = scopeKey(
    params.restaurantScope,
    params.branchScope
  );

  return prisma.aiEngineerPermissionGrant.upsert({
    where: {
      permissionKey_restaurantScope_branchScope: {
        permissionKey: params.permissionKey,
        restaurantScope,
        branchScope,
      },
    },
    create: {
      permissionKey: params.permissionKey,
      enabled: params.enabled,
      approvalType: params.approvalType ?? null,
      grantedByUserId: params.grantedByUserId ?? null,
      grantedAt: params.grantedAt ?? null,
      expiresAt: params.expiresAt ?? null,
      restaurantScope,
      branchScope,
      dataScope: params.dataScope ?? null,
      sessionId: params.sessionId ?? null,
    },
    update: {
      enabled: params.enabled,
      approvalType: params.approvalType ?? null,
      grantedByUserId: params.grantedByUserId ?? null,
      grantedAt: params.grantedAt ?? null,
      expiresAt: params.expiresAt ?? null,
      revokedAt: params.enabled ? null : new Date(),
      dataScope: params.dataScope ?? null,
      sessionId: params.sessionId ?? null,
    },
  });
}

function computeExpiry(approvalType: ApprovalType): Date | null {
  const now = Date.now();
  if (approvalType === "once") return new Date(now + 5 * 60 * 1000);
  if (approvalType === "15min") return new Date(now + 15 * 60 * 1000);
  if (approvalType === "session") return new Date(now + 8 * 60 * 60 * 1000);
  if (approvalType === "permanent") return null;
  return new Date(now + 5 * 60 * 1000);
}

function validateApprovalType(def: ReturnType<typeof getPermissionDef>, approvalType: ApprovalType) {
  if (!def) return "صلاحية غير معروفة";
  if (def.blocked) return "هذه العملية محظورة بالكامل";
  const max = maxAllowedApprovalType(def);
  const order: ApprovalType[] = ["reject", "once", "15min", "session", "permanent"];
  if (order.indexOf(approvalType) > order.indexOf(max)) {
    return `نوع الموافقة ${approvalLabel(approvalType)} غير مسموح — الحد الأقصى: ${approvalLabel(max)}`;
  }
  return null;
}

export async function grantPermission(params: {
  permissionKey: string;
  approvalType: ApprovalType;
  userId: string;
  restaurantScope?: string | null;
  branchScope?: string | null;
  dataScope?: string | null;
  reason?: string;
}) {
  const def = getPermissionDef(params.permissionKey);
  const err = validateApprovalType(def, params.approvalType);
  if (err) throw new Error(err);
  if (params.approvalType === "reject") throw new Error("استخدم رفض الطلب بدلاً من ذلك");

  const state = await ensureSession(params.userId);
  const expiresAt = computeExpiry(params.approvalType);

  await upsertGrant({
    permissionKey: params.permissionKey,
    enabled: true,
    approvalType: params.approvalType,
    grantedByUserId: params.userId,
    grantedAt: new Date(),
    expiresAt,
    restaurantScope: params.restaurantScope,
    branchScope: params.branchScope,
    dataScope: params.dataScope,
    sessionId: params.approvalType === "session" ? state.sessionId : null,
  });

  await appendAudit({
    eventType: "permission_approved",
    userId: params.userId,
    permissionKey: params.permissionKey,
    scope: {
      restaurantScope: params.restaurantScope,
      branchScope: params.branchScope,
      dataScope: params.dataScope,
    },
    decision: approvalLabel(params.approvalType),
    reason: params.reason ?? null,
  });

  return { ok: true, expiresAt: expiresAt?.toISOString() ?? null };
}

export async function revokePermission(params: {
  permissionKey: string;
  userId: string;
  reason?: string;
  restaurantScope?: string | null;
  branchScope?: string | null;
}) {
  const { restaurantScope, branchScope } = scopeKey(
    params.restaurantScope,
    params.branchScope
  );

  await prisma.aiEngineerPermissionGrant.updateMany({
    where: {
      permissionKey: params.permissionKey,
      restaurantScope,
      branchScope,
    },
    data: {
      enabled: false,
      revokedAt: new Date(),
      revokeReason: params.reason ?? "إلغاء من المالك",
    },
  });

  await appendAudit({
    eventType: "permission_revoked",
    userId: params.userId,
    permissionKey: params.permissionKey,
    reason: params.reason ?? "إلغاء من المالك",
  });
}

export async function emergencyStop(userId: string) {
  const state = await getGlobalState();

  await prisma.aiEngineerPermissionGrant.updateMany({
    where: { enabled: true },
    data: {
      enabled: false,
      revokedAt: new Date(),
      revokeReason: "إيقاف طوارئ للمهندس الذكي",
    },
  });

  await prisma.aiEngineerPendingAction.updateMany({
    where: { status: "pending" },
    data: { status: "cancelled", decision: "emergency_stop" },
  });

  await prisma.aiEngineerWorkflow.updateMany({
    where: { status: "running" },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledByUserId: userId,
    },
  });

  await prisma.aiEngineerGlobalState.update({
    where: { id: "singleton" },
    data: {
      emergencyStop: true,
      chatReadOnly: true,
      sessionId: null,
      updatedByUserId: userId,
    },
  });

  await appendAudit({
    eventType: "emergency_stop",
    userId,
    result: "تم إيقاف المهندس الذكي — جميع الصلاحيات ملغاة",
    metadata: { previousSessionId: state.sessionId },
  });

  return { ok: true };
}

export async function resumeEngineer(userId: string) {
  await prisma.aiEngineerGlobalState.update({
    where: { id: "singleton" },
    data: {
      emergencyStop: false,
      chatReadOnly: false,
      updatedByUserId: userId,
    },
  });
  await applyPreset("monitoring_only", userId);
  return { ok: true };
}

export async function requestAction(params: {
  permissionKey: string;
  titleAr: string;
  payload: unknown;
  preview?: object;
  requestedBy?: string;
  restaurantScope?: string | null;
  branchScope?: string | null;
  workflowId?: string;
  workflowStep?: number;
}) {
  const def = getPermissionDef(params.permissionKey);
  if (!def) throw new Error("صلاحية غير معروفة");
  if (def.blocked) throw new Error("عملية محظورة");

  const state = await getGlobalState();
  if (state.emergencyStop) throw new Error("المهندس الذكي متوقف — لا يمكن تنفيذ عمليات");

  const payloadHash = hashPayload(params.payload);

  const pending = await prisma.aiEngineerPendingAction.create({
    data: {
      titleAr: params.titleAr,
      permissionKey: params.permissionKey,
      payload: params.payload as object,
      payloadHash,
      preview: params.preview ?? undefined,
      requestedBy: params.requestedBy ?? "ai_engineer",
      restaurantScope: params.restaurantScope ?? null,
      branchScope: params.branchScope ?? null,
      workflowId: params.workflowId ?? null,
      workflowStep: params.workflowStep ?? null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  await appendAudit({
    eventType: "permission_requested",
    userId: params.requestedBy ?? null,
    permissionKey: params.permissionKey,
    scope: {
      restaurantScope: params.restaurantScope,
      branchScope: params.branchScope,
      pendingActionId: pending.id,
    },
    metadata: { titleAr: params.titleAr },
  });

  return pending;
}

export async function decidePendingAction(params: {
  pendingActionId: string;
  decision: ApprovalType | "reject";
  userId: string;
  reason?: string;
}) {
  const pending = await prisma.aiEngineerPendingAction.findUnique({
    where: { id: params.pendingActionId },
  });
  if (!pending) throw new Error("طلب غير موجود");
  if (pending.status !== "pending") throw new Error("الطلب ليس قيد الانتظار");
  if (pending.expiresAt < new Date()) {
    await prisma.aiEngineerPendingAction.update({
      where: { id: pending.id },
      data: { status: "expired" },
    });
    throw new Error("انتهت صلاحية الطلب");
  }

  if (params.decision === "reject") {
    await prisma.aiEngineerPendingAction.update({
      where: { id: pending.id },
      data: {
        status: "rejected",
        decidedByUserId: params.userId,
        decision: "reject",
        decisionReason: params.reason ?? null,
      },
    });
    await appendAudit({
      eventType: "permission_denied",
      userId: params.userId,
      permissionKey: pending.permissionKey,
      decision: "رفض",
      reason: params.reason ?? null,
    });
    return { ok: true, token: null };
  }

  const def = getPermissionDef(pending.permissionKey)!;
  const err = validateApprovalType(def, params.decision);
  if (err) throw new Error(err);

  const state = await ensureSession(params.userId);
  const expiresAt = computeExpiry(params.decision)!;
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await prisma.aiEngineerApprovalToken.create({
    data: {
      tokenHash,
      permissionKey: pending.permissionKey,
      payloadHash: pending.payloadHash,
      grantedByUserId: params.userId,
      expiresAt,
      approvalType: params.decision,
      restaurantScope: pending.restaurantScope,
      branchScope: pending.branchScope,
      sessionId: params.decision === "session" ? state.sessionId : null,
      pendingActionId: pending.id,
    },
  });

  await prisma.aiEngineerPendingAction.update({
    where: { id: pending.id },
    data: {
      status: "approved",
      decidedByUserId: params.userId,
      decision: params.decision,
      decisionReason: params.reason ?? null,
    },
  });

  await appendAudit({
    eventType: "permission_approved",
    userId: params.userId,
    permissionKey: pending.permissionKey,
    decision: approvalLabel(params.decision),
    reason: params.reason ?? null,
    metadata: { pendingActionId: pending.id },
  });

  return { ok: true, token: rawToken, expiresAt: expiresAt.toISOString() };
}

export type ExecuteResult =
  | { ok: true; result: string }
  | { ok: false; error: string; code: string };

export async function validateAndExecute(params: {
  permissionKey: string;
  payload: unknown;
  approvalToken?: string | null;
  actorId?: string;
}): Promise<ExecuteResult> {
  const def = getPermissionDef(params.permissionKey);
  if (!def) return { ok: false, error: "صلاحية غير معروفة", code: "UNKNOWN_PERMISSION" };
  if (def.blocked) {
    await appendAudit({
      eventType: "denied_attempt",
      permissionKey: params.permissionKey,
      reason: "عملية محظورة",
    });
    return { ok: false, error: "عملية محظورة بالكامل", code: "FORBIDDEN" };
  }

  const state = await getGlobalState();
  if (state.emergencyStop) {
    await appendAudit({
      eventType: "denied_attempt",
      permissionKey: params.permissionKey,
      reason: "إيقاف طوارئ نشط",
    });
    return { ok: false, error: "المهندس الذكي متوقف", code: "EMERGENCY_STOP" };
  }

  const payloadHash = hashPayload(params.payload);
  const now = new Date();

  if (params.approvalToken) {
    const tokenHash = createHash("sha256").update(params.approvalToken).digest("hex");
    const token = await prisma.aiEngineerApprovalToken.findUnique({
      where: { tokenHash },
    });

    if (!token) {
      await appendAudit({
        eventType: "denied_attempt",
        permissionKey: params.permissionKey,
        reason: "رمز موافقة غير صالح",
      });
      return { ok: false, error: "رمز موافقة غير صالح", code: "INVALID_TOKEN" };
    }

    if (token.usedAt) {
      await appendAudit({
        eventType: "denied_attempt",
        permissionKey: params.permissionKey,
        reason: "إعادة استخدام رمز موافقة",
      });
      return { ok: false, error: "تم استخدام هذا الرمز مسبقاً — مرفوض", code: "TOKEN_REPLAY" };
    }

    if (token.expiresAt < now) {
      await appendAudit({
        eventType: "permission_expired",
        permissionKey: params.permissionKey,
        reason: "انتهت صلاحية الرمز",
      });
      return { ok: false, error: "انتهت صلاحية الموافقة", code: "TOKEN_EXPIRED" };
    }

    if (
      token.permissionKey !== params.permissionKey ||
      token.payloadHash !== payloadHash
    ) {
      await appendAudit({
        eventType: "denied_attempt",
        permissionKey: params.permissionKey,
        reason: "عدم تطابق الرمز مع العملية",
      });
      return { ok: false, error: "الرمز لا يطابق هذه العملية", code: "TOKEN_MISMATCH" };
    }

    if (token.sessionId && token.sessionId !== state.sessionId) {
      await appendAudit({
        eventType: "denied_attempt",
        permissionKey: params.permissionKey,
        reason: "جلسة غير متطابقة",
      });
      return { ok: false, error: "الموافقة مرتبطة بجلسة أخرى", code: "SESSION_MISMATCH" };
    }

    await prisma.aiEngineerApprovalToken.update({
      where: { tokenHash },
      data: { usedAt: now },
    });

    if (token.approvalType === "once") {
      await revokePermission({
        permissionKey: params.permissionKey,
        userId: token.grantedByUserId,
        reason: "استُخدمت موافقة لمرة واحدة",
        restaurantScope: token.restaurantScope,
        branchScope: token.branchScope,
      });
    }
  } else {
    const grant = await prisma.aiEngineerPermissionGrant.findFirst({
      where: {
        permissionKey: params.permissionKey,
        enabled: true,
        revokedAt: null,
        restaurantScope: "",
        branchScope: "",
      },
    });

    if (!grant) {
      await appendAudit({
        eventType: "denied_attempt",
        permissionKey: params.permissionKey,
        reason: "لا توجد صلاحية مفعّلة",
      });
      return { ok: false, error: "لا توجد موافقة — مطلوب موافقة المالك", code: "NO_GRANT" };
    }

    if (grant.expiresAt && grant.expiresAt < now) {
      await appendAudit({
        eventType: "permission_expired",
        permissionKey: params.permissionKey,
      });
      await revokePermission({
        permissionKey: params.permissionKey,
        userId: grant.grantedByUserId ?? "system",
        reason: "انتهت الصلاحية",
      });
      return { ok: false, error: "انتهت صلاحية الإذن", code: "GRANT_EXPIRED" };
    }

    if (grant.sessionId && grant.sessionId !== state.sessionId) {
      await appendAudit({
        eventType: "denied_attempt",
        permissionKey: params.permissionKey,
        reason: "جلسة غير متطابقة",
      });
      return { ok: false, error: "الصلاحية مرتبطة بجلسة أخرى", code: "SESSION_MISMATCH" };
    }

    if (def.riskLevel !== "low" || !grant.approvalType) {
      await appendAudit({
        eventType: "denied_attempt",
        permissionKey: params.permissionKey,
        reason: "عملية حساسة بدون رمز",
      });
      return {
        ok: false,
        error: "هذه العملية تتطلب موافقة صريحة لكل تنفيذ",
        code: "TOKEN_REQUIRED",
      };
    }
  }

  await prisma.aiEngineerPermissionGrant.updateMany({
    where: { permissionKey: params.permissionKey, enabled: true },
    data: {
      lastUsedAt: now,
      usageCount: { increment: 1 },
    },
  });

  const result = await simulateExecution(params.permissionKey, params.payload);

  await appendAudit({
    eventType: result.ok ? "action_executed" : "action_failed",
    userId: params.actorId ?? null,
    permissionKey: params.permissionKey,
    result: result.summary,
    metadata: { payloadHash },
  });

  return result.ok
    ? { ok: true, result: result.summary }
    : { ok: false, error: result.summary, code: "EXECUTION_FAILED" };
}

async function simulateExecution(
  permissionKey: string,
  _payload: unknown
): Promise<{ ok: boolean; summary: string }> {
  const def = getPermissionDef(permissionKey);
  if (!def) return { ok: false, summary: "صلاحية غير معروفة" };

  if (permissionKey === "read_openai_status") {
    const { getPlatformOpenAiPublicStatus } = await import("@/lib/platform/openai-brain");
    const status = await getPlatformOpenAiPublicStatus();
    return {
      ok: true,
      summary: status.connected
        ? `OpenAI متصل — الموديل: ${status.modelId} (بدون عرض مفتاح)`
        : "OpenAI غير متصل في AI Brain",
    };
  }

  const readOnly = [
    "read_platform_health",
    "read_error_logs",
    "read_vercel_status",
    "read_database_status",
    "read_meta_status",
    "read_whatsapp_status",
    "read_moyasar_status",
    "read_supabase_status",
    "read_openai_status",
    "run_safe_tests",
    "read_settings_redacted",
  ];

  if (readOnly.includes(permissionKey)) {
    return { ok: true, summary: `تم تنفيذ ${def.nameAr} — قراءة فقط، لا تعديل بيانات` };
  }

  if (permissionKey === "deploy_production" || permissionKey === "rollback") {
    return {
      ok: true,
      summary: `محاكاة ${def.nameAr} — لم يتم النشر فعلياً (حماية الإنتاج)`,
    };
  }

  if (permissionKey.startsWith("read_") || permissionKey.includes("status")) {
    return { ok: true, summary: `تم ${def.nameAr} — بدون تعديل` };
  }

  return {
    ok: true,
    summary: `تمت محاكاة ${def.nameAr} — لا تعديل على بيانات Fabrika/الإنتاج`,
  };
}

export async function listAuditLogs(limit = 50) {
  return prisma.aiEngineerAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listPendingActions() {
  return prisma.aiEngineerPendingAction.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getActiveWorkflow() {
  return prisma.aiEngineerWorkflow.findFirst({
    where: { status: "running" },
    orderBy: { startedAt: "desc" },
  });
}

export async function createWorkflow(params: {
  titleAr: string;
  steps: Array<{ titleAr: string; permissionKey: string; auto?: boolean }>;
  startedBy: string;
}) {
  return prisma.aiEngineerWorkflow.create({
    data: {
      titleAr: params.titleAr,
      steps: params.steps,
      startedBy: params.startedBy,
    },
  });
}

export async function cancelWorkflow(workflowId: string, userId: string) {
  await prisma.aiEngineerWorkflow.update({
    where: { id: workflowId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledByUserId: userId,
    },
  });
  await appendAudit({
    eventType: "workflow_cancelled",
    userId,
    metadata: { workflowId },
  });
}

export async function expireStalePermissions() {
  const now = new Date();
  const expired = await prisma.aiEngineerPermissionGrant.findMany({
    where: {
      enabled: true,
      expiresAt: { lt: now },
    },
  });

  for (const g of expired) {
    await revokePermission({
      permissionKey: g.permissionKey,
      userId: g.grantedByUserId ?? "system",
      reason: "انتهاء الصلاحية التلقائي",
      restaurantScope: g.restaurantScope,
      branchScope: g.branchScope,
    });
    await appendAudit({
      eventType: "permission_expired",
      userId: g.grantedByUserId,
      permissionKey: g.permissionKey,
    });
  }

  return expired.length;
}
