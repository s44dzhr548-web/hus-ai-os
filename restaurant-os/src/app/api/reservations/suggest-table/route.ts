import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { suggestBestTable } from "@/lib/reception";

export const dynamic = "force-dynamic";

const RECEPTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

export async function POST(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const body = await req.json();
  const { guestCount = 2, branchId, preferredArea } = body;

  const table = await suggestBestTable(
    restaurantId!,
    parseInt(String(guestCount)) || 2,
    branchId,
    preferredArea
  );

  if (!table) {
    return NextResponse.json({ error: "لا توجد طاولة متاحة" }, { status: 404 });
  }

  return NextResponse.json({
    table: {
      id: table.id,
      number: table.number,
      capacity: table.capacity,
      floorZone: table.floorZone,
    },
    reason: `أفضل طاولة لـ ${guestCount} ضيوف (سعة ${table.capacity})`,
  });
}
