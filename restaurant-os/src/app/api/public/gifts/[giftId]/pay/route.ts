import { NextRequest, NextResponse } from "next/server";
import { payForGift } from "@/lib/table-gifts/service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ giftId: string }> }
) {
  const { giftId } = await params;
  try {
    const body = await req.json();
    const result = await payForGift({
      giftId,
      senderTableId: body.senderTableId,
      method: body.method,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل الدفع";
    return NextResponse.json({ error: msg }, { status: 402 });
  }
}
