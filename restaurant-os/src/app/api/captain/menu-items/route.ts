import { NextResponse } from "next/server";
import { requireCaptainAccess } from "@/lib/captain/auth";
import { listCaptainMenuItems } from "@/lib/captain/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireCaptainAccess();
  if (error) return error;

  const items = await listCaptainMenuItems(restaurantId!);
  return NextResponse.json({ ok: true, items });
}
