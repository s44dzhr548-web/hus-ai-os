import { NextRequest, NextResponse } from "next/server";
import { respondToGift } from "@/lib/table-gifts/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ giftId: string }> }
) {
  const { giftId } = await params;
  try {
    const body = await req.json();
    const gift = await respondToGift(
      giftId,
      body.receiverTableId,
      Boolean(body.accept)
    );
    return NextResponse.json({ gift });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
