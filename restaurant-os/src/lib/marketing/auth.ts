import { NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";

/** Roles allowed to access Marketing — Owner + Marketing Manager only */
export const MARKETING_ROLES = ["OWNER", "ADMIN", "MARKETING"] as const;

export async function requireMarketingAccess() {
  const { restaurantId, session, error } = await requireRestaurantRole([
    ...MARKETING_ROLES,
  ]);
  if (error) return { error, restaurantId: null, session: null };

  const featureErr = await assertFeature(restaurantId!, "marketing");
  if (featureErr) return { error: featureErr, restaurantId: null, session: null };

  return { error: null, restaurantId: restaurantId!, session };
}

export function marketingError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireMarketingOwnerAccess() {
  const result = await requireMarketingAccess();
  if (result.error) return { ...result, canManageSecrets: false };
  const role = result.session?.user?.role;
  const canManageSecrets = role === "OWNER" || role === "ADMIN";
  if (!canManageSecrets && role === "MARKETING") {
    return { ...result, canManageSecrets: false };
  }
  return { ...result, canManageSecrets };
}

export const MARKETING_ROUTE_PREFIX = "/dashboard/marketing";
