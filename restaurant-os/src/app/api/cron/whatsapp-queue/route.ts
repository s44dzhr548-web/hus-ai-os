import { NextRequest, NextResponse } from "next/server";
import { processWhatsAppQueue } from "@/lib/after-visit-whatsapp/service";

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

  const results = await processWhatsAppQueue(30);
  const processed = results.filter(Boolean).length;

  return NextResponse.json({
    ok: true,
    processed,
    ranAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
