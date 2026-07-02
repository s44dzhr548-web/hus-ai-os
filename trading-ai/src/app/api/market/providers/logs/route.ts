import { NextResponse } from "next/server";
import { getEnterpriseLogs, getEnterpriseLogStats } from "@/lib/market/provider-manager/logging";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 100);
  const type = searchParams.get("type") as import("@/lib/market/provider-manager/logging").EnterpriseLogType | null;
  return NextResponse.json({
    logs: getEnterpriseLogs(limit, type ?? undefined),
    stats: getEnterpriseLogStats(),
  });
}
