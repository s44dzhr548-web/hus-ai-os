import { NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";

/** Roles allowed to access Marketing — Owner + Marketing Manager only */
export const MARKETING_ROLES = ["OWNER", "ADMIN", "MARKETING"] as const;

/** Manager read-only access to WhatsApp Business hub */
export const WHATSAPP_BUSINESS_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "MARKETING"] as const;

/** Owner-only write access for WhatsApp Business secrets & automation */
export const WHATSAPP_BUSINESS_OWNER_ROLES = ["OWNER"] as const;

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

export async function requireWhatsAppBusinessReadAccess() {
  const { restaurantId, session, error } = await requireRestaurantRole([
    ...WHATSAPP_BUSINESS_READ_ROLES,
  ]);
  if (error) return { error, restaurantId: null, session: null, canEdit: false };

  const featureErr = await assertFeature(restaurantId!, "marketing");
  if (featureErr) return { error: featureErr, restaurantId: null, session: null, canEdit: false };

  const role = session?.user?.role;
  const canEdit = role === "OWNER";
  return { error: null, restaurantId: restaurantId!, session, canEdit };
}

export async function requireWhatsAppBusinessOwnerAccess() {
  const result = await requireWhatsAppBusinessReadAccess();
  if (result.error) return result;
  if (!result.canEdit) {
    return {
      ...result,
      error: NextResponse.json(
        { error: "صلاحية المالك فقط — Connect / Disconnect / Tokens / Automation" },
        { status: 403 }
      ),
    };
  }
  return result;
}

export const MARKETING_ROUTE_PREFIX = "/dashboard/marketing";
