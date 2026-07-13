import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRestaurant } from "@/lib/api-auth";

/** Granular table-management permission keys (owner-only by default). */
export const TABLE_MANAGEMENT_PERMISSIONS = [
  "TABLE_CREATE",
  "TABLE_EDIT",
  "TABLE_DELETE",
  "TABLE_REORDER",
  "TABLE_RENUMBER",
  "TABLE_QR_CHANGE",
  "TABLE_STATUS",
  "TABLE_MOVE_AREA",
  "TABLE_BULK",
  "TABLE_IMPORT",
  "TABLE_EXPORT",
  "TABLE_RESTORE",
  "TABLE_DUPLICATE",
] as const;

export type TableManagementPermission = (typeof TABLE_MANAGEMENT_PERMISSIONS)[number];

export interface StaffPermissionsJson {
  tableManagement?: boolean;
  tablePermissions?: TableManagementPermission[];
}

export function parseStaffPermissions(raw: unknown): StaffPermissionsJson {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    tableManagement: o.tableManagement === true,
    tablePermissions: Array.isArray(o.tablePermissions)
      ? (o.tablePermissions.filter((p) =>
          TABLE_MANAGEMENT_PERMISSIONS.includes(p as TableManagementPermission)
        ) as TableManagementPermission[])
      : undefined,
  };
}

export async function isPrimaryRestaurantOwner(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: userId },
    select: { id: true },
  });
  return !!restaurant;
}

export async function staffHasTableManagementGrant(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  const staff = await prisma.staff.findFirst({
    where: { userId, restaurantId, isActive: true },
    select: { permissionsJson: true },
  });
  if (!staff) return false;
  const perms = parseStaffPermissions(staff.permissionsJson);
  return perms.tableManagement === true;
}

export async function canManageTables(
  userId: string,
  restaurantId: string,
  isPlatformAdmin?: boolean
): Promise<boolean> {
  if (isPlatformAdmin) return true;
  if (await isPrimaryRestaurantOwner(userId, restaurantId)) return true;
  return staffHasTableManagementGrant(userId, restaurantId);
}

export async function requireTableManagement(requestedRestaurantId?: string | null) {
  const result = await requireRestaurant(requestedRestaurantId);
  if (result.error) return result;

  const userId = result.session!.user.id;
  const allowed = await canManageTables(
    userId,
    result.restaurantId!,
    result.isPlatformAdmin
  );

  if (!allowed) {
    return {
      ...result,
      error: NextResponse.json(
        {
          error: "إدارة الطاولات متاحة لمالك المطعم فقط",
          code: "TABLE_MANAGEMENT_FORBIDDEN",
        },
        { status: 403 }
      ),
    };
  }

  return { ...result, canManageTables: true as const };
}

export async function getTableManagementAccess(
  userId: string,
  restaurantId: string,
  isPlatformAdmin?: boolean
) {
  const isOwner = await isPrimaryRestaurantOwner(userId, restaurantId);
  const granted = await staffHasTableManagementGrant(userId, restaurantId);
  const canManage = isPlatformAdmin || isOwner || granted;
  return {
    canManage,
    isOwner,
    explicitlyGranted: granted,
    permissions: canManage ? [...TABLE_MANAGEMENT_PERMISSIONS] : [],
  };
}
