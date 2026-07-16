import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { buildTableDuplicateReport } from "@/lib/table-duplicates";
import { displayTableNumber } from "@/lib/table-number-normalize";

export const dynamic = "force-dynamic";

const OWNER_ROLES = ["OWNER", "ADMIN"];

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole([
    ...OWNER_ROLES,
    "MANAGER",
    "RECEPTION",
  ]);
  if (error) return error;

  const report = await buildTableDuplicateReport(restaurantId!);
  return NextResponse.json(report);
}

export async function POST(req: NextRequest) {
  const { restaurantId, session, error } = await requireRestaurantRole(OWNER_ROLES);
  if (error) return error;

  const body = await req.json();
  const action = body.action as string;

  if (action === "rename_duplicate" && body.tableId && body.newDisplayNumber) {
    const table = await prisma.diningTable.findFirst({
      where: { id: body.tableId, branch: { restaurantId: restaurantId! } },
    });
    if (!table) {
      return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
    }
    const display = displayTableNumber(body.newDisplayNumber);
    const { findNormalizedTableConflict } = await import("@/lib/table-duplicates");
    const conflict = await findNormalizedTableConflict(table.branchId, display, table.id);
    if (conflict) {
      return NextResponse.json(
        { error: conflict.message, conflictTableId: conflict.table.id },
        { status: 409 }
      );
    }
    const { tableNumberFields } = await import("@/lib/table-duplicates");
    const fields = tableNumberFields(display);
    const updated = await prisma.diningTable.update({
      where: { id: table.id },
      data: {
        displayNumber: fields.display,
        normalizedNumber: fields.normalized,
        label: fields.display,
      },
    });
    return NextResponse.json({ ok: true, table: updated });
  }

  if (action === "archive_duplicate" && body.tableId) {
    const table = await prisma.diningTable.findFirst({
      where: { id: body.tableId, branch: { restaurantId: restaurantId! } },
    });
    if (!table) {
      return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
    }
    const [orders, sessions] = await Promise.all([
      prisma.order.count({
        where: { tableId: table.id, status: { in: ["NEW", "PREPARING", "READY"] } },
      }),
      prisma.tableSession.count({ where: { tableId: table.id, endedAt: null } }),
    ]);
    if (orders > 0 || sessions > 0) {
      return NextResponse.json(
        { error: "لا يمكن أرشفة طاولة عليها طلبات أو جلسات نشطة" },
        { status: 409 }
      );
    }
    await prisma.diningTable.update({
      where: { id: table.id },
      data: { isArchived: true, archivedAt: new Date(), isActive: false },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
}
