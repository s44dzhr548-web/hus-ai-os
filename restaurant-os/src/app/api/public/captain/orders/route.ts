import { NextRequest, NextResponse } from "next/server";
import { createCaptainOrder } from "@/lib/captain/orders";
import { getTableQrSessionFromRequest } from "@/lib/table-qr-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = getTableQrSessionFromRequest(req);
    if (!session?.tableId) {
      return NextResponse.json(
        {
          error: "يرجى مسح رمز QR الخاص بالطاولة أولاً",
          code: "TABLE_QR_SESSION_REQUIRED",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const idempotencyKey =
      req.headers.get("x-idempotency-key")?.trim() ||
      String(body.requestId || body.idempotencyKey || "").trim() ||
      undefined;

    const order = await createCaptainOrder({
      tableId: session.tableId,
      restaurantId: session.restaurantId,
      items: (Array.isArray(body.items) ? body.items : []).map(
        (i: { menuItemId: string; quantity: number; notes?: string }) => ({
          menuItemId: String(i.menuItemId),
          quantity: Math.max(1, Number(i.quantity) || 1),
          notes: i.notes ? String(i.notes) : undefined,
        })
      ),
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
