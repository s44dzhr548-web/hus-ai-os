import { NextResponse } from "next/server";
import {
  getBotStatus,
  pauseBot,
  resumeBot,
  runBotCycle,
  setBotEmergencyStop,
  setBotEnabled,
  startBot,
  stopBot,
} from "@/lib/bot/auto-paper-bot";

export async function GET() {
  return NextResponse.json(await getBotStatus());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.action === "toggle") {
    await setBotEnabled(Boolean(body.enabled));
    return NextResponse.json(await getBotStatus());
  }
  if (body.action === "start") {
    await startBot();
    return NextResponse.json(await getBotStatus());
  }
  if (body.action === "stop") {
    await stopBot();
    return NextResponse.json(await getBotStatus());
  }
  if (body.action === "pause") {
    await pauseBot();
    return NextResponse.json(await getBotStatus());
  }
  if (body.action === "resume") {
    await resumeBot();
    return NextResponse.json(await getBotStatus());
  }
  if (body.action === "emergency_stop") {
    await setBotEmergencyStop(Boolean(body.active ?? true));
    return NextResponse.json(await getBotStatus());
  }
  if (body.action === "clear_emergency") {
    await setBotEmergencyStop(false);
    await resumeBot();
    return NextResponse.json(await getBotStatus());
  }
  if (body.action === "run") {
    return NextResponse.json(await runBotCycle({ trigger: "manual" }));
  }

  return NextResponse.json(
    { error: "action required: run | start | stop | pause | resume | emergency_stop | clear_emergency | toggle" },
    { status: 400 }
  );
}
