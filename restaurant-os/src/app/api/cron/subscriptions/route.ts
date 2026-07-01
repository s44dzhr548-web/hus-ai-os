import { NextRequest, NextResponse } from "next/server";
import {
  computeBillingStats,
  expireDueSubscriptions,
  markPastDueSubscriptions,
} from "@/lib/billing/subscription-billing";

export const dynamic = "force-dynamic";

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await expireDueSubscriptions();
  const renewed = await markPastDueSubscriptions();

  return NextResponse.json({
    ok: true,
    expired,
    autoRenewed: renewed,
    ranAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
