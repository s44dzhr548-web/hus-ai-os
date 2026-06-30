import { NextResponse } from "next/server";
import { getDashboardState } from "@/lib/dashboard-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getDashboardState();
  return NextResponse.json(state);
}
