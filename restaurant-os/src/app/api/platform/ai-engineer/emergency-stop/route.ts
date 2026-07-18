import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import {
  emergencyStop,
  resumeEngineer,
} from "@/lib/ai-engineer/permission-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const userId = session!.user.id;

  if (body.action === "stop") {
    const result = await emergencyStop(userId);
    return NextResponse.json(result);
  }

  if (body.action === "resume") {
    const result = await resumeEngineer(userId);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
