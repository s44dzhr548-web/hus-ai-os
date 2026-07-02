import { NextResponse } from "next/server";
import { getBotStatus, runBotCycle, setBotEnabled, startBot, stopBot } from "@/lib/bot/auto-paper-bot";

export async function GET() {
  return NextResponse.json(await getBotStatus());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.action === "toggle") {
    setBotEnabled(Boolean(body.enabled));
    return NextResponse.json(await getBotStatus());
  }
  if (body.action === "start") {
    startBot();
    return NextResponse.json(await getBotStatus());
  }
  if (body.action === "stop") {
    stopBot();
    return NextResponse.json(await getBotStatus());
  }
  if (body.action === "run") {
    return NextResponse.json(await runBotCycle());
  }
  return NextResponse.json({ error: "action required: run | toggle" }, { status: 400 });
}
