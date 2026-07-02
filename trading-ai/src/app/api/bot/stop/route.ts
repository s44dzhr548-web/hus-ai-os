import { NextResponse } from "next/server";
import { getBotStatus, stopBot } from "@/lib/bot/auto-paper-bot";

export async function POST() {
  await stopBot();
  return NextResponse.json(await getBotStatus());
}
