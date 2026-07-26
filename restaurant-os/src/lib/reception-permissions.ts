import { NextResponse } from "next/server";
import { canManageTables } from "@/lib/table-management-permissions";

/** Reception staff may view reservations, check in, assign existing tables — not restructure tables. */
export const RECEPTION_PERMISSION_KEYS = {
  view: "reception.view",
  reservationsUpdate: "reservations.update",
  checkIn: "reservations.check_in",
  assignTable: "reservations.assign_table",
  tablesView: "tables.view",
} as const;

export const TABLE_STRUCTURE_KEYS = {
  create: "tables.create",
  update: "tables.update",
  delete: "tables.delete",
} as const;

export async function staffCanManageTableStructure(
  userId: string,
  restaurantId: string,
  isPlatformAdmin?: boolean
): Promise<boolean> {
  return canManageTables(userId, restaurantId, isPlatformAdmin);
}

export async function assertManualTableAllowed(
  userId: string,
  restaurantId: string,
  isPlatformAdmin?: boolean
): Promise<NextResponse | null> {
  const allowed = await staffCanManageTableStructure(userId, restaurantId, isPlatformAdmin);
  if (!allowed) {
    return NextResponse.json(
      { error: "ليس لديك صلاحية لإدارة الطاولات", code: "TABLE_MANAGEMENT_FORBIDDEN" },
      { status: 403 }
    );
  }
  return null;
}
