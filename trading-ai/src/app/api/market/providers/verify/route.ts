import { NextResponse } from "next/server";
import { verifyAllProviders } from "@/lib/market/verify";

export async function GET() {
  const report = await verifyAllProviders(false);
  return NextResponse.json(report);
}
