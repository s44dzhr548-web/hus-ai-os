import { NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";

/** Owner + Marketing Manager only — no reception/kitchen/manager */
export const MC_ROLES = ["OWNER", "ADMIN", "MARKETING"] as const;

export async function requireMarketingCenterAccess() {
  const { restaurantId, session, error } = await requireRestaurantRole([...MC_ROLES]);
  if (error) return { error, restaurantId: null, session: null };

  const featureErr = await assertFeature(restaurantId!, "marketing");
  if (featureErr) return { error: featureErr, restaurantId: null, session: null };

  return { error: null, restaurantId: restaurantId!, session };
}

export function mcError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export const MC_BASE = "/dashboard/marketing-center";
