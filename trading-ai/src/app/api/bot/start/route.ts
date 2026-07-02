import { NextResponse } from "next/server";
import { getBotStatus, startBot } from "@/lib/bot/auto-paper-bot";

export async function POST() {
  await startBot();
  return NextResponse.json(await getBotStatus());
}
