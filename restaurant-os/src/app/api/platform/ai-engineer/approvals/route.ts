import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import {
  requestAction,
  decidePendingAction,
  listPendingActions,
} from "@/lib/ai-engineer/permission-service";
import type { ApprovalType } from "@/lib/ai-engineer/permission-catalog";
import { getPermissionDef } from "@/lib/ai-engineer/permission-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const pending = await listPendingActions();
  return NextResponse.json({ pending });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const { action } = body as { action: string };
  const userId = session!.user.id;

  if (action === "request") {
    const def = getPermissionDef(body.permissionKey);
    if (!def) {
      return NextResponse.json({ error: "صلاحية غير معروفة" }, { status: 400 });
    }

    const pending = await requestAction({
      permissionKey: body.permissionKey,
      titleAr: body.titleAr ?? def.nameAr,
      payload: body.payload ?? {},
      preview: body.preview ?? {
        whatWillDo: def.descriptionAr,
        affectedSystems: [def.affectedSystem],
        dataModified: def.dataImpact !== "قراءة فقط" && def.dataImpact !== "لا تعديل",
        willDeploy: body.permissionKey.includes("deploy"),
        riskLevel: def.riskLevel,
        reversible: !["deploy_production", "rollback", "run_additive_migration"].includes(
          body.permissionKey
        ),
        backupRequired: def.riskLevel === "high",
        currentCheckResult: "جاهز للمراجعة",
      },
      requestedBy: body.requestedBy ?? "ai_engineer",
      restaurantScope: body.restaurantScope,
      branchScope: body.branchScope,
    });

    return NextResponse.json({ pending });
  }

  if (action === "decide") {
    try {
      const result = await decidePendingAction({
        pendingActionId: body.pendingActionId,
        decision: body.decision as ApprovalType | "reject",
        userId,
        reason: body.reason,
      });
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "فشل القرار" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
