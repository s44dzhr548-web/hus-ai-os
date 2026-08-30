import { NextRequest, NextResponse } from "next/server";
import { requireCaptainAccess, orderLockedResponse } from "@/lib/captain/auth";
import { confirmCaptainOrder } from "@/lib/captain/orders";

export const dynamic = "force-dynamic";

function isOrderLockedError(e: unknown) {
  return e instanceof Error && (e as Error & { code?: string }).code === "ORDER_LOCKED";
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const auth = await requireCaptainAccess();
  if (auth.error) return auth.error;
  const { restaurantId, session } = auth;
  const userId = session!.user.id;

  try {
    const order = await confirmCaptainOrder(restaurantId!, orderId, userId!);
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    if (isOrderLockedError(e)) return orderLockedResponse();
    const message = e instanceof Error ? e.message : "فشل تأكيد الطلب";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
