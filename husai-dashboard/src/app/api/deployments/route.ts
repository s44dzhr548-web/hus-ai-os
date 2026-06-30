import { NextResponse } from "next/server";
import { getDeploymentHistory } from "@/lib/platform-status";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ deployments: getDeploymentHistory() });
}
