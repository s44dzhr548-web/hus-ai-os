import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import {
  getTableBill,
  serializeTableSession,
  finalizeTableSession,
} from "@/lib/reception";
import { getSessionAuditLogs } from "@/lib/session-audit";
import { updateTableSession, type TableConflict } from "@/lib/session-edit";
import type { TableSessionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const RECEPTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

function staffFromSession(session: { user: { id?: string; name?: string | null } }) {
  return { userId: session.user.id, name: session.user.name };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { restaurantId, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const tableSession = await prisma.tableSession.findFirst({
    where: { id: sessionId, restaurantId: restaurantId! },
  });
  if (!tableSession) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }

  const [bill, auditLogs] = await Promise.all([
    getTableBill(tableSession.tableId, tableSession.startedAt),
    getSessionAuditLogs(sessionId),
  ]);

  return NextResponse.json({
    session: serializeTableSession({
      ...tableSession,
      currentBill: bill.currentBill,
      ordersCount: bill.orderCount,
    }),
    auditLogs,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { restaurantId, session, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const tableSession = await prisma.tableSession.findFirst({
    where: { id: sessionId, restaurantId: restaurantId! },
  });

  if (!tableSession) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }

  const body = await req.json();
  const staff = staffFromSession(session!);
  const role = session?.user.role;

  if (body.closeSession) {
    const result = await finalizeTableSession(sessionId, {
      staffName: staff.name,
      staffUserId: staff.userId,
    });
    if (!result) {
      return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
    }
    return NextResponse.json(
      serializeTableSession({
        ...result.session,
        currentBill: result.bill.currentBill,
      })
    );
  }

  try {
    const updated = await updateTableSession(
      sessionId,
      restaurantId!,
      {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        guestCount: body.guestCount != null ? parseInt(String(body.guestCount)) : undefined,
        minimumSpendAmount: body.minimumSpendAmount,
        notes: body.notes,
        appendNote: body.appendNote,
        status: body.status as TableSessionStatus | undefined,
        tableId: body.tableId,
        manualTable: body.manualTable,
        forceAssign: body.forceAssign,
      },
      staff,
      role
    );

    const bill = await getTableBill(updated.tableId, updated.startedAt);
    const auditLogs = await getSessionAuditLogs(sessionId, 20);

    return NextResponse.json({
      session: serializeTableSession({
        ...updated,
        currentBill: bill.currentBill,
        ordersCount: bill.orderCount,
      }),
      auditLogs,
    });
  } catch (e) {
    const err = e as Error & { conflict?: TableConflict };
    if (err.conflict) {
      return NextResponse.json(
        {
          error: err.conflict.message,
          errorAr: "هذه الطاولة لديها جلسة نشطة بالفعل.",
          code: err.conflict.code,
          conflictSessionId: err.conflict.conflictSessionId,
          conflictCustomerName: err.conflict.conflictCustomerName,
          conflictTableId: err.conflict.conflictTableId,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: err.message || "فشل تحديث الجلسة" },
      { status: 400 }
    );
  }
}

/** Soft-close: keeps permanent historical record */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { restaurantId, session, error } = await requireRestaurantRole(RECEPTION_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const tableSession = await prisma.tableSession.findFirst({
    where: { id: sessionId, restaurantId: restaurantId! },
  });

  if (!tableSession) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }

  const staff = staffFromSession(session!);
  const result = await finalizeTableSession(sessionId, {
    staffName: staff.name,
    staffUserId: staff.userId,
  });
  if (!result) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }

  return NextResponse.json(
    serializeTableSession({
      ...result.session,
      currentBill: result.bill.currentBill,
    })
  );
}
