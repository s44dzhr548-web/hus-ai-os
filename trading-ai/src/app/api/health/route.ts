import { NextResponse } from "next/server";
import { getPaperAccount } from "@/lib/alpaca/client";

export async function GET() {
  const account = await getPaperAccount();
  return NextResponse.json({
    status: "ok",
    service: "trading-ai",
    mode: process.env.ALPACA_API_KEY ? "alpaca" : "mock",
    paperAccount: account,
    timestamp: new Date().toISOString(),
  });
}
