import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runWhatsAppHealthCheck } from "@/lib/marketing/whatsapp-setup";

export const dynamic = "force-dynamic";

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.whatsAppBusinessConnection.findMany({
    where: { isActive: true },
    select: { restaurantId: true },
  });

  const results = [];
  for (const c of connections) {
    results.push({
      restaurantId: c.restaurantId,
      ...(await runWhatsAppHealthCheck(c.restaurantId)),
    });
  }

  return NextResponse.json({
    ok: true,
    checked: results.length,
    results,
    ranAt: new Date().toISOString(),
    note: "Vercel Hobby: daily schedule. Hourly requires Pro plan.",
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
