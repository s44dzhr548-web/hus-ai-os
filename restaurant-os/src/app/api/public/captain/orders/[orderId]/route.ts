import { NextRequest, NextResponse } from "next/server";
import { getCaptainOrderPublic } from "@/lib/captain/orders";
import { CAPTAIN_STATUS_LABELS } from "@/lib/captain/status";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const order = await getCaptainOrderPublic(orderId);
  if (!order) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  return NextResponse.json({
    ...order,
    statusLabel: CAPTAIN_STATUS_LABELS[order.status] ?? order.status,
    payment: null,
  });
}
