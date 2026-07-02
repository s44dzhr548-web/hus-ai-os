import { NextResponse } from "next/server";
import { getAuditLog, getAuditStats } from "@/lib/audit/log";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 100);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  return NextResponse.json({
    stats: getAuditStats(),
    entries: getAuditLog(limit, symbol),
  });
}
