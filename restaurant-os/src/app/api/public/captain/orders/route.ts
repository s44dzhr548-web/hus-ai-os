import { NextRequest, NextResponse } from "next/server";
import { createCaptainOrder } from "@/lib/captain/orders";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tableId = String(body.tableId || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    const idempotencyKey =
      req.headers.get("x-idempotency-key")?.trim() ||
      String(body.requestId || body.idempotencyKey || "").trim() ||
      undefined;

    const order = await createCaptainOrder({
      tableId,
      items: items.map((i: { menuItemId: string; quantity: number; notes?: string }) => ({
        menuItemId: String(i.menuItemId),
        quantity: Math.max(1, Number(i.quantity) || 1),
        notes: i.notes ? String(i.notes) : undefined,
      })),
      notes: body.notes ? String(body.notes) : undefined,
      customerName: body.customerName ? String(body.customerName) : undefined,
      customerPhone: body.customerPhone ? String(body.customerPhone) : undefined,
      idempotencyKey,
      guestToken: body.guestToken ? String(body.guestToken) : undefined,
    });

    return NextResponse.json({
      ok: true,
      order,
      message: "تم إرسال طلبك إلى كابتن الصالة",
      trackingToken: order.publicAccessToken,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل إنشاء الطلب";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
