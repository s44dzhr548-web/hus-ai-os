import { NextResponse } from "next/server";
import { buildSmartMoneySnapshot } from "@/lib/intelligence/smart-money-engine";

export async function GET() {
  const snapshot = await buildSmartMoneySnapshot();
  return NextResponse.json({
    flow: snapshot,
    executionMode: "paper_only",
    brokerEnabled: false,
  });
}
