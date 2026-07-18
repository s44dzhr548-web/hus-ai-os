import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { validateAndExecute } from "@/lib/ai-engineer/permission-service";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const { permissionKey, payload, approvalToken, pendingActionId } = body as {
    permissionKey: string;
    payload?: unknown;
    approvalToken?: string;
    pendingActionId?: string;
  };

  const result = await validateAndExecute({
    permissionKey,
    payload: payload ?? {},
    approvalToken,
    actorId: session!.user.id,
  });

  if (pendingActionId && result.ok) {
    await prisma.aiEngineerPendingAction.update({
      where: { id: pendingActionId },
      data: {
        status: "executed",
        executedAt: new Date(),
        resultSummary: result.result,
      },
    });
  } else if (pendingActionId && !result.ok) {
    await prisma.aiEngineerPendingAction.update({
      where: { id: pendingActionId },
      data: {
        status: "failed",
        resultSummary: result.error,
      },
    });
  }

  if (!result.ok) {
    return NextResponse.json(result, { status: 403 });
  }

  return NextResponse.json(result);
}
