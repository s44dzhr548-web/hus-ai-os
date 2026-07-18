import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import {
  listPermissionsWithState,
  getGlobalState,
  applyPreset,
  grantPermission,
  revokePermission,
  expireStalePermissions,
} from "@/lib/ai-engineer/permission-service";
import { PRESETS, type PresetId, type ApprovalType } from "@/lib/ai-engineer/permission-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  await expireStalePermissions();

  const [permissions, globalState, presets] = await Promise.all([
    listPermissionsWithState(),
    getGlobalState(),
    Promise.resolve(PRESETS),
  ]);

  return NextResponse.json({
    permissions,
    globalState: {
      emergencyStop: globalState.emergencyStop,
      chatReadOnly: globalState.chatReadOnly,
      activePreset: globalState.activePreset,
      sessionId: globalState.sessionId,
      sessionStartedAt: globalState.sessionStartedAt?.toISOString() ?? null,
    },
    presets: Object.entries(presets).map(([id, p]) => ({
      id,
      labelAr: (p as { labelAr: string; descriptionAr: string }).labelAr,
      descriptionAr: (p as { labelAr: string; descriptionAr: string }).descriptionAr,
    })),
    userId: session!.user.id,
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const { action } = body as { action: string };

  const userId = session!.user.id;

  if (action === "apply_preset") {
    const presetId = body.presetId as PresetId;
    await applyPreset(presetId, userId);
    return NextResponse.json({ ok: true });
  }

  if (action === "grant") {
    const result = await grantPermission({
      permissionKey: body.permissionKey,
      approvalType: body.approvalType as ApprovalType,
      userId,
      restaurantScope: body.restaurantScope,
      branchScope: body.branchScope,
      dataScope: body.dataScope,
      reason: body.reason,
    });
    return NextResponse.json(result);
  }

  if (action === "revoke") {
    await revokePermission({
      permissionKey: body.permissionKey,
      userId,
      reason: body.reason,
      restaurantScope: body.restaurantScope,
      branchScope: body.branchScope,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "toggle") {
    const { permissionKey, enabled, approvalType, restaurantScope, branchScope, dataScope } =
      body;
    if (enabled) {
      const result = await grantPermission({
        permissionKey,
        approvalType: (approvalType ?? "once") as ApprovalType,
        userId,
        restaurantScope,
        branchScope,
        dataScope,
      });
      return NextResponse.json(result);
    }
    await revokePermission({ permissionKey, userId, restaurantScope, branchScope });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
