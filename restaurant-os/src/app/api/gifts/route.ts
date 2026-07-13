import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import {
  listRestaurantGifts,
  updateGiftStatusAdmin,
} from "@/lib/table-gifts/service";
import type { TableGiftStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION"];

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole(ROLES);
  if (error) return error;
  return NextResponse.json({ gifts: await listRestaurantGifts(restaurantId!) });
}

export async function PATCH(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(ROLES);
  if (error) return error;
  try {
    const body = await req.json();
    const gift = await updateGiftStatusAdmin(
      body.giftId,
      restaurantId!,
      body.status as TableGiftStatus
    );
    return NextResponse.json({ gift });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
