import { NextRequest, NextResponse } from "next/server";
import { requireCaptainAccess } from "@/lib/captain/auth";
import {
  getCaptainOrderForStaff,
  listTableCaptainHistory,
  updateCaptainOrderItems,
  updateCaptainOrderStatus,
} from "@/lib/captain/orders";
import type { OrderStatus } from "@prisma/client";
import { orderLockedResponse } from "@/lib/captain/auth";

export const dynamic = "force-dynamic";

function isOrderLockedError(e: unknown) {
  return e instanceof Error && (e as Error & { code?: string }).code === "ORDER_LOCKED";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const { error, restaurantId } = await requireCaptainAccess();
  if (error) return error;

  const tableId = req.nextUrl.searchParams.get("tableId");
  if (tableId) {
    const history = await listTableCaptainHistory(restaurantId!, tableId);
    const current = history.find((o) => o.id === orderId) ?? null;
    return NextResponse.json({ current, history });
  }

  const order = await getCaptainOrderForStaff(restaurantId!, orderId);
  if (!order) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, order });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const { error, restaurantId } = await requireCaptainAccess();
  if (error) return error;

  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : null;
  if (!items?.length) {
    return NextResponse.json({ error: "الأصناف مطلوبة" }, { status: 400 });
  }

  try {
    const order = await updateCaptainOrderItems(restaurantId!, orderId, {
      items: items.map((i: { menuItemId: string; quantity: number; notes?: string }) => ({
        menuItemId: String(i.menuItemId),
        quantity: Math.max(1, Number(i.quantity) || 1),
        notes: i.notes ? String(i.notes) : undefined,
      })),
      notes: body.notes !== undefined ? String(body.notes || "") : undefined,
    });
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    if (isOrderLockedError(e)) return orderLockedResponse();
    const message = e instanceof Error ? e.message : "فشل تحديث الطلب";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const auth = await requireCaptainAccess();
  if (auth.error) return auth.error;
  const { restaurantId, session } = auth;
  const userId = session!.user.id;

  const body = await req.json();
  const status = String(body.status || "").trim().toUpperCase() as OrderStatus;
  if (!status) {
    return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });
  }

  try {
    const order = await updateCaptainOrderStatus(restaurantId!, orderId, status, userId);
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل تحديث الحالة";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
