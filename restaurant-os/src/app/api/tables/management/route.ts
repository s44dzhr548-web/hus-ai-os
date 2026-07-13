import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import { requireTableManagement, getTableManagementAccess } from "@/lib/table-management-permissions";
import prisma from "@/lib/prisma";
import {
  archiveManagedTable,
  bulkTableAction,
  createBulkBackupSnapshot,
  duplicateManagedTable,
  importTablesFromRows,
  regenerateAllBranchQr,
  regenerateOneTableQr,
  renumberBranchTables,
  restoreManagedTable,
  updateFloorPositions,
} from "@/lib/table-management-service";
import { logTableAudit } from "@/lib/table-audit";

export const dynamic = "force-dynamic";

/** GET — check current user's table management permissions */
export async function GET(req: NextRequest) {
  const { restaurantId, session, isPlatformAdmin, error } = await requireRestaurant();
  if (error) return error;

  const access = await getTableManagementAccess(
    session!.user.id,
    restaurantId!,
    isPlatformAdmin
  );
  return NextResponse.json(access);
}

/** POST — management actions: renumber, duplicate, restore, bulk, import */
export async function POST(req: NextRequest) {
  const auth = await requireTableManagement();
  if (auth.error) return auth.error;
  const { restaurantId, session } = auth;

  const body = await req.json();
  const action = String(body.action || "");

  try {
    switch (action) {
      case "renumber": {
        if (!body.branchId) {
          return NextResponse.json({ error: "الفرع مطلوب" }, { status: 400 });
        }
        const tables = await renumberBranchTables(
          restaurantId!,
          session!.user.id,
          body.branchId
        );
        return NextResponse.json({ tables, renumbered: true });
      }

      case "duplicate": {
        if (!body.id) {
          return NextResponse.json({ error: "معرف الطاولة مطلوب" }, { status: 400 });
        }
        const table = await duplicateManagedTable(restaurantId!, session!.user.id, body.id);
        return NextResponse.json(table, { status: 201 });
      }

      case "restore": {
        if (!body.id) {
          return NextResponse.json({ error: "معرف الطاولة مطلوب" }, { status: 400 });
        }
        const table = await restoreManagedTable(restaurantId!, session!.user.id, body.id);
        return NextResponse.json(table);
      }

      case "archive": {
        if (!body.id) {
          return NextResponse.json({ error: "معرف الطاولة مطلوب" }, { status: 400 });
        }
        const table = await archiveManagedTable(
          restaurantId!,
          session!.user.id,
          body.id,
          body.force === true
        );
        return NextResponse.json(table);
      }

      case "bulk": {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length) {
          return NextResponse.json({ error: "لم يتم تحديد طاولات" }, { status: 400 });
        }
        const results = await bulkTableAction(
          restaurantId!,
          session!.user.id,
          body.bulkAction,
          ids,
          { floorZone: body.floorZone, force: body.force }
        );
        return NextResponse.json({ results });
      }

      case "import": {
        if (!body.branchId || !Array.isArray(body.rows)) {
          return NextResponse.json({ error: "بيانات الاستيراد غير صالحة" }, { status: 400 });
        }
        const created = await importTablesFromRows(
          restaurantId!,
          session!.user.id,
          body.branchId,
          body.rows
        );
        return NextResponse.json({ created, count: created.length }, { status: 201 });
      }

      case "reorder": {
        const order = body.order as Array<{ id: string; sortOrder: number }> | undefined;
        if (!order?.length) {
          return NextResponse.json({ error: "ترتيب غير صالح" }, { status: 400 });
        }
        for (const item of order) {
          await prisma.diningTable.updateMany({
            where: { id: item.id, branch: { restaurantId: restaurantId! } },
            data: { sortOrder: item.sortOrder },
          });
        }
        return NextResponse.json({ ok: true });
      }

      case "regenerate-qr": {
        if (!body.id) {
          return NextResponse.json({ error: "معرف الطاولة مطلوب" }, { status: 400 });
        }
        const table = await regenerateOneTableQr(restaurantId!, session!.user.id, body.id);
        return NextResponse.json(table);
      }

      case "regenerate-all-qr": {
        if (!body.branchId) {
          return NextResponse.json({ error: "الفرع مطلوب" }, { status: 400 });
        }
        const tables = await regenerateAllBranchQr(
          restaurantId!,
          session!.user.id,
          body.branchId
        );
        return NextResponse.json({ tables, count: tables.length });
      }

      case "floor-positions": {
        const positions = body.positions as Array<{
          id: string;
          floorMapX: number;
          floorMapY: number;
        }>;
        if (!positions?.length) {
          return NextResponse.json({ error: "مواقع غير صالحة" }, { status: 400 });
        }
        const updated = await updateFloorPositions(
          restaurantId!,
          session!.user.id,
          positions
        );
        return NextResponse.json({ updated });
      }

      case "bulk-backup": {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!body.branchId || !ids.length) {
          return NextResponse.json({ error: "بيانات النسخ الاحتياطي ناقصة" }, { status: 400 });
        }
        const backup = await createBulkBackupSnapshot(restaurantId!, body.branchId, ids);
        await logTableAudit({
          restaurantId: restaurantId!,
          userId: session!.user.id,
          action: "TABLE_BULK",
          metadata: { type: "backup", backup },
        });
        return NextResponse.json({ backup });
      }

      default:
        return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل الإجراء" },
      { status: 400 }
    );
  }
}
