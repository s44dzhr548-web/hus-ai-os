import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import {
  listRestaurantWishes,
  updateWishStatusAdmin,
} from "@/lib/customer-wishes/service";
import type { CustomerWishStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION"];

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole(ROLES);
  if (error) return error;
  return NextResponse.json({ wishes: await listRestaurantWishes(restaurantId!) });
}

export async function PATCH(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(ROLES);
  if (error) return error;
  try {
    const body = await req.json();
    const wish = await updateWishStatusAdmin(
      body.wishId,
      restaurantId!,
      body.status as CustomerWishStatus
    );
    return NextResponse.json({ wish });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
