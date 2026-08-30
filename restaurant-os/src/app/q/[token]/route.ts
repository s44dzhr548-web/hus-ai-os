import { NextRequest, NextResponse } from "next/server";
import { resolveTableByPublicQrToken } from "@/lib/permanent-qr";
import {
  createTableQrSessionValue,
  TABLE_QR_SESSION_COOKIE,
  tableQrSessionCookieOptions,
} from "@/lib/table-qr-session";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const table = await resolveTableByPublicQrToken(token);
  if (!table) {
    return NextResponse.redirect(new URL("/404", req.url));
  }

  const target = new URL(`/menu/${table.id}?direct=1`, req.url);
  const response = NextResponse.redirect(target);
  response.cookies.set(
    TABLE_QR_SESSION_COOKIE,
    createTableQrSessionValue({
      tableId: table.id,
      restaurantId: table.restaurantId,
      branchId: table.branchId,
      publicQrToken: table.publicQrToken,
    }),
    tableQrSessionCookieOptions()
  );
  return response;
}
