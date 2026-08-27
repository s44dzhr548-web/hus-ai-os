import { NextRequest, NextResponse } from "next/server";
import { requireCaptainAccess } from "@/lib/captain/auth";
import { listTableCaptainHistory, updateCaptainOrderStatus } from "@/lib/captain/orders";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const { error, restaurantId } = await requireCaptainAccess();
  if (error) return error;

  const tableId = req.nextUrl.searchParams.get("tableId");
  if (!tableId) {
    return NextResponse.json({ error: "tableId مطلوب" }, { status: 400 });
  }

  const history = await listTableCaptainHistory(restaurantId!, tableId);
  const current = history.find((o) => o.id === orderId) ?? null;
  return NextResponse.json({ current, history });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const { error, restaurantId } = await requireCaptainAccess();
  if (error) return error;

  const body = await req.json();
  const status = String(body.status || "").trim().toUpperCase() as OrderStatus;
  if (!status) {
    return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });
  }

  try {
    const order = await updateCaptainOrderStatus(restaurantId!, orderId, status);
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل تحديث الحالة";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
