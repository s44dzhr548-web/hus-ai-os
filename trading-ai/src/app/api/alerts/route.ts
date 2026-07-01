import { NextResponse } from "next/server";
import { getAlerts, getWhatsAppPayload, markAlertRead } from "@/lib/learning/tracker";

export async function GET() {
  const alerts = getAlerts();
  return NextResponse.json({
    alerts,
    unread: alerts.filter((a) => !a.read).length,
    whatsappStructure: alerts.filter((a) => a.whatsappReady).map(getWhatsAppPayload),
    emailEnabled: Boolean(process.env.SMTP_HOST) === false,
    emailNote: "Email alerts require SMTP_HOST — structure ready, delivery disabled in mock mode",
  });
}

export async function PATCH(request: Request) {
  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = markAlertRead(id);
  return NextResponse.json({ ok });
}
