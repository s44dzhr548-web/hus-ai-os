import { NextResponse } from "next/server";
import { createAlert } from "@/lib/learning/tracker";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    message?: string;
    symbol?: string;
    type?: "signal" | "risk" | "news" | "price" | "economic" | "portfolio" | "system";
    severity?: "low" | "medium" | "high";
  };

  if (!body.title || !body.message) {
    return NextResponse.json({ error: "title and message required" }, { status: 400 });
  }

  const alert = createAlert({
    channel: "dashboard",
    type: body.type ?? "signal",
    title: body.title,
    message: body.message,
    symbol: body.symbol?.toUpperCase(),
    severity: body.severity ?? "medium",
    whatsappReady: true,
    emailReady: true,
  });

  return NextResponse.json({ ok: true, alert, executionMode: "paper_only" });
}
