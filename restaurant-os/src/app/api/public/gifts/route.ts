import { NextRequest, NextResponse } from "next/server";
import {
  createGift,
  listGiftableTables,
  listGiftsForTable,
} from "@/lib/table-gifts/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tableId = sp.get("tableId");
  if (!tableId) {
    return NextResponse.json({ error: "tableId مطلوب" }, { status: 400 });
  }

  try {
    if (sp.get("tables") === "1") {
      return NextResponse.json({ tables: await listGiftableTables(tableId) });
    }
    const role = (sp.get("role") as "sender" | "receiver" | "all") || "all";
    return NextResponse.json({ gifts: await listGiftsForTable(tableId, role) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gift = await createGift({
      senderTableId: body.senderTableId,
      receiverTableId: body.receiverTableId,
      productId: body.productId,
      quantity: body.quantity,
      giftMessage: body.giftMessage,
      senderDisplayName: body.senderDisplayName,
      isAnonymous: body.isAnonymous,
    });
    return NextResponse.json({ gift }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل إرسال الهدية";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
