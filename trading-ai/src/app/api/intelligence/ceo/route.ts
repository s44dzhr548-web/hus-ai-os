import { NextResponse } from "next/server";
import { buildCEODashboard } from "@/lib/intelligence/ceo-dashboard";

export async function GET() {
  return NextResponse.json(await buildCEODashboard());
}
