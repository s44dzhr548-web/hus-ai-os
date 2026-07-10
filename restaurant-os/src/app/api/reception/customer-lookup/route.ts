import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { getCustomerHistory } from "@/lib/reception";

export const dynamic = "force-dynamic";

const RECEPTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone?.trim()) {
    return NextResponse.json({ error: "رقم الجوال مطلوب" }, { status: 400 });
  }

  const history = await getCustomerHistory(restaurantId!, phone.trim());
  if (!history) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, customer: history });
}
