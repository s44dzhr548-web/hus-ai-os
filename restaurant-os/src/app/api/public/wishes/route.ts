import { NextRequest, NextResponse } from "next/server";
import { createCustomerWish, listWishesForTable } from "@/lib/customer-wishes/service";
import type { CustomerWishType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get("tableId");
  if (!tableId) {
    return NextResponse.json({ error: "tableId مطلوب" }, { status: 400 });
  }
  try {
    return NextResponse.json({ wishes: await listWishesForTable(tableId) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const wish = await createCustomerWish({
      tableId: body.tableId,
      type: body.type as CustomerWishType,
      message: body.message,
      customerName: body.customerName,
    });
    return NextResponse.json({ wish }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل إرسال الأمنية";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
