import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { updateRestaurantFromBody } from "@/lib/restaurant-settings-update";

/** Active restaurant for dashboard (respects platform admin cookie). */
export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  const { loadRestaurantForSettings } = await import("@/lib/restaurant-settings-update");
  const restaurant = await loadRestaurantForSettings(restaurantId!);
  if (!restaurant) {
    return NextResponse.json({ error: "المطعم غير موجود", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    ...restaurant,
    googleMapsEmbedUrl: restaurant.googleMapsEmbedSrc,
  });
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح", code: "INVALID_JSON" }, { status: 400 });
  }

  return updateRestaurantFromBody(restaurantId!, body);
}
