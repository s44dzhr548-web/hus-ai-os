import { NextResponse } from "next/server";
import { runMultiAgentConsensus } from "@/lib/intelligence/multi-agent-consensus";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "AAPL").toUpperCase();
  const lang = searchParams.get("lang") === "en" ? "en" : "ar";
  return NextResponse.json(await runMultiAgentConsensus(symbol, lang));
}
