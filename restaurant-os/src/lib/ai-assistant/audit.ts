import prisma from "@/lib/prisma";
import { sanitizeForLog } from "@/lib/ai-assistant/security";
import type { AiToolName } from "@/lib/ai-assistant/types";

export async function logAiAssistantAction(params: {
  restaurantId: string;
  userId?: string | null;
  commandText?: string | null;
  toolName: AiToolName | string;
  inputPayload?: unknown;
  beforeState?: unknown;
  afterState?: unknown;
  resultSummary?: string;
  status: "success" | "failed" | "pending" | "cancelled";
  confirmationStatus?: "confirmed" | "cancelled" | "not_required";
  idempotencyKey?: string | null;
}) {
  try {
    await prisma.aiAssistantActionLog.create({
      data: {
        restaurantId: params.restaurantId,
        userId: params.userId ?? null,
        commandText: params.commandText?.slice(0, 2000) ?? null,
        toolName: params.toolName,
        inputPayload: sanitizeForLog(params.inputPayload) as never,
        beforeState: sanitizeForLog(params.beforeState) as never,
        afterState: sanitizeForLog(params.afterState) as never,
        resultSummary: params.resultSummary?.slice(0, 4000) ?? null,
        status: params.status,
        confirmationStatus: params.confirmationStatus ?? null,
        idempotencyKey: params.idempotencyKey ?? null,
      },
    });
  } catch (e) {
    console.error("[ai-assistant-audit]", e);
  }
}

export async function listAiAssistantActionLogs(restaurantId: string, limit = 50) {
  return prisma.aiAssistantActionLog.findMany({
    where: { restaurantId },
    orderBy: { executedAt: "desc" },
    take: limit,
    select: {
      id: true,
      toolName: true,
      commandText: true,
      resultSummary: true,
      status: true,
      confirmationStatus: true,
      executedAt: true,
    },
  });
}
