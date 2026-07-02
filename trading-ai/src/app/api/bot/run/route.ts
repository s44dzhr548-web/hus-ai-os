import { NextResponse } from "next/server";
import { runBotCycle } from "@/lib/bot/auto-paper-bot";

export async function POST() {
  return NextResponse.json(await runBotCycle());
}
