import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { listAuditLogs } from "@/lib/ai-engineer/permission-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const logs = await listAuditLogs(limit);

  return NextResponse.json({
    logs: logs.map((l: (typeof logs)[number]) => ({
      id: l.id,
      eventType: l.eventType,
      userId: l.userId,
      permissionKey: l.permissionKey,
      scope: l.scope,
      decision: l.decision,
      reason: l.reason,
      result: l.result,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
