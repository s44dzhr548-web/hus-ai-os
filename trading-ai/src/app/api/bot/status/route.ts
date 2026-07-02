import { NextResponse } from "next/server";
import { getBotStatus } from "@/lib/bot/auto-paper-bot";

export async function GET() {
  return NextResponse.json(await getBotStatus());
}
