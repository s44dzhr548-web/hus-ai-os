import prisma from "@/lib/prisma";
import { runOpenAiAssistantTurn } from "@/lib/ai-assistant/openai";
import {
  executeAiTool,
  previewWriteAction,
} from "@/lib/ai-assistant/tools";
import { logAiAssistantAction } from "@/lib/ai-assistant/audit";
import { routeFallbackCommand } from "@/lib/ai-assistant/fallback-router";
import {
  WRITE_TOOLS,
  type AiToolName,
  type ChatAssistantResponse,
  type ToolContext,
} from "@/lib/ai-assistant/types";

const PENDING_TTL_MS = 10 * 60 * 1000;

function isWriteTool(name: string): name is AiToolName {
  return (WRITE_TOOLS as string[]).includes(name);
}

async function handleRoutedTool(
  toolName: AiToolName,
  args: Record<string, unknown>,
  ctx: ToolContext,
  commandText: string
): Promise<ChatAssistantResponse> {
  if (isWriteTool(toolName)) {
    const preview = previewWriteAction(toolName, args);
    const expiresAt = new Date(Date.now() + PENDING_TTL_MS);
    const pending = await prisma.aiAssistantPendingAction.create({
      data: {
        restaurantId: ctx.restaurantId,
        userId: ctx.userId,
        toolName,
        inputPayload: args as never,
        previewSummary: preview,
        commandText,
        expiresAt,
      },
    });
    await logAiAssistantAction({
      restaurantId: ctx.restaurantId,
      userId: ctx.userId,
      commandText,
      toolName,
      inputPayload: args,
      status: "pending",
      confirmationStatus: "not_required",
      resultSummary: preview,
    });
    return {
      message: `يتطلب هذا الإجراء تأكيدك:\n${preview}\n\nاضغط «تأكيد التنفيذ» للمتابعة أو «إلغاء».`,
      pendingAction: {
        pendingActionId: pending.id,
        toolName,
        previewSummary: preview,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  const result = await executeAiTool(toolName, args, ctx);
  await logAiAssistantAction({
    restaurantId: ctx.restaurantId,
    userId: ctx.userId,
    commandText,
    toolName,
    inputPayload: args,
    beforeState: result.beforeState,
    afterState: result.afterState,
    resultSummary: result.summary,
    status: result.ok ? "success" : "failed",
    confirmationStatus: "not_required",
  });
  return {
    message: result.summary,
    toolResults: [{ tool: toolName, summary: result.summary, data: result.data }],
  };
}

export async function processAssistantMessage(params: {
  restaurantId: string;
  userId: string;
  userName?: string | null;
  userRole: string;
  message: string;
}): Promise<ChatAssistantResponse> {
  const ctx: ToolContext = {
    restaurantId: params.restaurantId,
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
  };

  const fallback = routeFallbackCommand(params.message);
  const useOpenAi = Boolean(process.env.OPENAI_API_KEY);

  if (fallback && !useOpenAi) {
    return handleRoutedTool(fallback.tool, fallback.args, ctx, params.message);
  }

  let turn = await runOpenAiAssistantTurn({ userMessage: params.message });
  const toolResults: Array<{ tool: string; summary: string; data?: unknown }> = [];
  let pendingAction: ChatAssistantResponse["pendingAction"];

  if (!turn.toolCalls.length && fallback && useOpenAi) {
    return handleRoutedTool(fallback.tool, fallback.args, ctx, params.message);
  }

  if (!turn.toolCalls.length && !turn.text && fallback) {
    return handleRoutedTool(fallback.tool, fallback.args, ctx, params.message);
  }

  for (let depth = 0; depth < 5; depth++) {
    if (!turn.toolCalls.length) break;

    const readOutputs: Array<{ callId: string; output: unknown }> = [];

    for (const call of turn.toolCalls) {
      const toolName = call.name as AiToolName;

      if (isWriteTool(toolName)) {
        const preview = previewWriteAction(toolName, call.arguments);
        const expiresAt = new Date(Date.now() + PENDING_TTL_MS);
        const pending = await prisma.aiAssistantPendingAction.create({
          data: {
            restaurantId: params.restaurantId,
            userId: params.userId,
            toolName,
            inputPayload: call.arguments as never,
            previewSummary: preview,
            commandText: params.message,
            expiresAt,
          },
        });

        await logAiAssistantAction({
          restaurantId: params.restaurantId,
          userId: params.userId,
          commandText: params.message,
          toolName,
          inputPayload: call.arguments,
          status: "pending",
          confirmationStatus: "not_required",
          resultSummary: preview,
        });

        pendingAction = {
          pendingActionId: pending.id,
          toolName,
          previewSummary: preview,
          expiresAt: expiresAt.toISOString(),
        };

        return {
          message:
            turn.text ||
            `يتطلب هذا الإجراء تأكيدك:\n${preview}\n\nاضغط «تأكيد التنفيذ» للمتابعة أو «إلغاء».`,
          toolResults,
          pendingAction,
        };
      }

      const result = await executeAiTool(toolName, call.arguments, ctx);
      toolResults.push({ tool: toolName, summary: result.summary, data: result.data });

      await logAiAssistantAction({
        restaurantId: params.restaurantId,
        userId: params.userId,
        commandText: params.message,
        toolName,
        inputPayload: call.arguments,
        beforeState: result.beforeState,
        afterState: result.afterState,
        resultSummary: result.summary,
        status: result.ok ? "success" : "failed",
        confirmationStatus: "not_required",
      });

      readOutputs.push({
        callId: call.id,
        output: result.ok
          ? { summary: result.summary, data: result.data }
          : { error: result.error || result.summary },
      });
    }

    if (!turn.rawResponseId || !readOutputs.length) break;

    turn = await runOpenAiAssistantTurn({
      userMessage: params.message,
      previousResponseId: turn.rawResponseId,
      toolOutputs: readOutputs,
    });
  }

  const message =
    turn.text ||
    (toolResults.length
      ? toolResults.map((t) => `• ${t.summary}`).join("\n")
      : "تمت المعالجة.");

  return { message, toolResults, pendingAction };
}

export async function confirmPendingAction(params: {
  pendingActionId: string;
  restaurantId: string;
  userId: string;
  userName?: string | null;
  userRole: string;
  idempotencyKey: string;
  confirm: boolean;
}): Promise<ChatAssistantResponse> {
  const pending = await prisma.aiAssistantPendingAction.findFirst({
    where: {
      id: params.pendingActionId,
      restaurantId: params.restaurantId,
      userId: params.userId,
    },
  });

  if (!pending) {
    return { message: "طلب التأكيد غير موجود أو منتهي." };
  }

  if (pending.expiresAt < new Date()) {
    await prisma.aiAssistantPendingAction.delete({ where: { id: pending.id } });
    return { message: "انتهت صلاحية طلب التأكيد." };
  }

  if (!params.confirm) {
    await prisma.aiAssistantPendingAction.delete({ where: { id: pending.id } });
    await logAiAssistantAction({
      restaurantId: params.restaurantId,
      userId: params.userId,
      commandText: pending.commandText,
      toolName: pending.toolName,
      inputPayload: pending.inputPayload,
      status: "cancelled",
      confirmationStatus: "cancelled",
      idempotencyKey: params.idempotencyKey,
      resultSummary: "ألغى المستخدم التنفيذ",
    });
    return { message: "تم إلغاء العملية." };
  }

  const dup = await prisma.aiAssistantActionLog.findUnique({
    where: {
      restaurantId_idempotencyKey: {
        restaurantId: params.restaurantId,
        idempotencyKey: params.idempotencyKey,
      },
    },
  });
  if (dup) {
    return { message: "تم تنفيذ هذه العملية مسبقاً." };
  }

  const ctx: ToolContext = {
    restaurantId: params.restaurantId,
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
  };

  const result = await executeAiTool(
    pending.toolName as AiToolName,
    pending.inputPayload as Record<string, unknown>,
    ctx
  );

  await logAiAssistantAction({
    restaurantId: params.restaurantId,
    userId: params.userId,
    commandText: pending.commandText,
    toolName: pending.toolName,
    inputPayload: pending.inputPayload,
    beforeState: result.beforeState,
    afterState: result.afterState,
    resultSummary: result.summary,
    status: result.ok ? "success" : "failed",
    confirmationStatus: "confirmed",
    idempotencyKey: params.idempotencyKey,
  });

  await prisma.aiAssistantPendingAction.delete({ where: { id: pending.id } });

  return {
    message: result.ok ? result.summary : `فشل التنفيذ: ${result.summary}`,
    toolResults: [{ tool: pending.toolName, summary: result.summary, data: result.data }],
  };
}
