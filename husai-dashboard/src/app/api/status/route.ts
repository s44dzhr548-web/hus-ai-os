import { NextResponse } from "next/server";
import { loadRegistry } from "@/lib/registry";
import { getPlatformStatus } from "@/lib/platform-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const registry = loadRegistry();
  const status = await getPlatformStatus();
  return NextResponse.json({ registry, status });
}
