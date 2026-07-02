import { NextResponse } from "next/server";
import { isRealTradingAllowed } from "@/lib/compliance/config";
import { runBotCycle } from "@/lib/bot/auto-paper-bot";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized — set CRON_SECRET" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    endpoint: "/api/bot/cron",
    schedule: "every 5 minutes",
    paperOnly: !isRealTradingAllowed(),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
  });
}

export async function POST(request: Request) {
  if (isRealTradingAllowed()) {
    return NextResponse.json({ error: "Real execution blocked" }, { status: 403 });
  }

  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized — Bearer CRON_SECRET required" }, { status: 401 });
  }

  const status = await runBotCycle({ trigger: "cron" });
  return NextResponse.json({
    ok: true,
    trigger: "cron",
    lifecycleStatus: status.lifecycleStatus,
    lastRunAt: status.lastRunAt,
    nextRunAt: status.nextRunAt,
    tradesToday: status.tradesToday,
    paperOnly: status.paperOnly,
    status,
  });
}
