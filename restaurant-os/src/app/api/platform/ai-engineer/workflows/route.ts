import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import {
  getActiveWorkflow,
  createWorkflow,
  cancelWorkflow,
} from "@/lib/ai-engineer/permission-service";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const workflow = await getActiveWorkflow();
  return NextResponse.json({ workflow });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const userId = session!.user.id;

  if (body.action === "create") {
    const workflow = await createWorkflow({
      titleAr: body.titleAr,
      steps: body.steps,
      startedBy: userId,
    });
    return NextResponse.json({ workflow });
  }

  if (body.action === "advance") {
    const workflow = await prisma.aiEngineerWorkflow.findUnique({
      where: { id: body.workflowId },
    });
    if (!workflow || workflow.status !== "running") {
      return NextResponse.json({ error: "Workflow not running" }, { status: 400 });
    }

    const steps = workflow.steps as Array<{ titleAr: string }>;
    const nextStep = workflow.currentStep + 1;
    const done = nextStep >= steps.length;

    const updated = await prisma.aiEngineerWorkflow.update({
      where: { id: workflow.id },
      data: {
        currentStep: done ? workflow.currentStep : nextStep,
        status: done ? "completed" : "running",
        completedAt: done ? new Date() : null,
        toolsUsed: body.toolsUsed ?? workflow.toolsUsed,
        resultSummary: body.resultSummary,
      },
    });

    return NextResponse.json({ workflow: updated });
  }

  if (body.action === "cancel") {
    await cancelWorkflow(body.workflowId, userId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
