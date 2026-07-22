import { NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import { isPlatformAdminUser } from "@/lib/permissions";
export const MARKETING_ROLES = ["OWNER", "ADMIN", "MARKETING"] as const;

/** Read-only access to ad platform cards */
export const ADS_PLATFORM_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "MARKETING"] as const;

/** Connect/disconnect ad accounts — owner or restaurant admin */
export const ADS_PLATFORM_CONNECT_ROLES = ["OWNER", "ADMIN"] as const;

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
  const platformAdmin = isPlatformAdminUser(session!.user);
  const canEdit = role === "OWNER" || platformAdmin;
  return { error: null, restaurantId: restaurantId!, session, canEdit };
}

export async function requireWhatsAppBusinessOwnerAccess() {
  const result = await requireWhatsAppBusinessReadAccess();
  if (result.error) return result;

  const platformAdmin = Boolean(result.session && isPlatformAdminUser(result.session.user));
  const canEdit = result.canEdit || platformAdmin;

  if (!canEdit) {
    return {
      ...result,
      canEdit: false,
      error: NextResponse.json(
        { error: "صلاحية المالك فقط — Connect / Disconnect / Tokens / Automation" },
        { status: 403 }
      ),
    };
  }
  return { ...result, canEdit: true };
}

export const MARKETING_ROUTE_PREFIX = "/dashboard/marketing";

export async function requireAdsPlatformReadAccess() {
  const { restaurantId, session, error, isPlatformAdmin } = await requireRestaurantRole([
    ...ADS_PLATFORM_READ_ROLES,
  ]);
  if (error) return { error, restaurantId: null, session: null, canConnect: false, canEdit: false };

  const featureErr = await assertFeature(restaurantId!, "marketing");
  if (featureErr) return { error: featureErr, restaurantId: null, session: null, canConnect: false, canEdit: false };

  const role = session?.user?.role;
  const canConnect =
    Boolean(isPlatformAdmin) || role === "OWNER" || role === "ADMIN";
  const canEdit = Boolean(isPlatformAdmin) || role === "OWNER" || role === "ADMIN" || role === "MARKETING";
  return { error: null, restaurantId: restaurantId!, session, canConnect, canEdit };
}

export async function requireAdsPlatformConnectAccess() {
  const result = await requireAdsPlatformReadAccess();
  if (result.error) return result;
  if (!result.canConnect) {
    return {
      ...result,
      error: NextResponse.json({ error: "صلاحية المالك أو مدير المطعم مطلوبة للربط" }, { status: 403 }),
    };
  }
  return result;
}
