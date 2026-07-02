import { NextResponse } from "next/server";
import { getBotStatus, runBotCycle } from "@/lib/bot/auto-paper-bot";
import { isRealTradingAllowed } from "@/lib/compliance/config";

export async function POST() {
  if (isRealTradingAllowed()) {
    return NextResponse.json({ error: "Real execution blocked" }, { status: 403 });
  }
  return NextResponse.json(await runBotCycle({ trigger: "manual" }));
}
