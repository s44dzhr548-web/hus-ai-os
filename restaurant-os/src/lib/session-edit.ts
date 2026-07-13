import type { TableIcon, TableSession, TableSessionStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  getActiveSessionForTable,
  syncTableOperationalStatus,
  upsertCustomerProfile,
} from "@/lib/reception";
import { upsertManualTable, tableIconEmoji } from "@/lib/table-meta";
import {
  appendPreviousTable,
  logSessionChanges,
  type AuditStaff,
  type PreviousTableEntry,
} from "@/lib/session-audit";
import {
  onCustomerUpdated,
  onSessionStatusChange,
  onTableAssigned,
} from "@/lib/visit-tracking";

export const FORCE_ASSIGN_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export function canForceAssign(role?: string | null) {
  return role != null && FORCE_ASSIGN_ROLES.includes(role);
}

export function formatSessionTableTitle(session: {
  tableNumber: number;
  tableDisplayNumber?: string | null;
  tableLabel?: string | null;
  tableIcon?: string | null;
}) {
  const icon = tableIconEmoji(session.tableIcon);
  const display =
    session.tableDisplayNumber ||
    session.tableLabel ||
    String(session.tableNumber);
  if (/^\d+$/.test(display)) {
    return `${icon} Table ${display}`;
  }
  return `${icon} ${display}`;
}

export type ManualTableAssignInput = {
  tableNumber: string | number;
  label?: string | null;
  zone?: string | null;
  tableIcon?: TableIcon | string | null;
  capacity?: number;
};

export type SessionEditInput = {
  customerName?: string;
  customerPhone?: string | null;
  guestCount?: number;
  minimumSpendAmount?: number | string | null;
  notes?: string;
  appendNote?: boolean;
  status?: TableSessionStatus;
  tableId?: string;
  manualTable?: ManualTableAssignInput;
  forceAssign?: boolean;
};

export type TableConflict = {
  code: "TABLE_OCCUPIED";
  message: string;
  conflictSessionId: string;
  conflictCustomerName: string;
  conflictTableId: string;
};

export async function checkTableSessionConflict(
  tableId: string,
  excludeSessionId?: string
): Promise<TableSession | null> {
  const active = await getActiveSessionForTable(tableId);
  if (!active) return null;
  if (excludeSessionId && active.id === excludeSessionId) return null;
  return active;
}

async function resolveTargetTable(
  restaurantId: string,
  branchId: string,
  input: { tableId?: string; manualTable?: ManualTableAssignInput }
) {
  if (input.tableId) {
    const table = await prisma.diningTable.findFirst({
      where: { id: input.tableId, branch: { restaurantId }, isActive: true },
    });
    if (!table) throw new Error("الطاولة غير موجودة");
    return table;
  }
  if (input.manualTable?.tableNumber != null && String(input.manualTable.tableNumber).trim()) {
    return upsertManualTable(restaurantId, branchId, {
      number: input.manualTable.tableNumber,
      label: input.manualTable.label,
      zone: input.manualTable.zone,
      tableIcon: input.manualTable.tableIcon,
      capacity: input.manualTable.capacity,
    });
  }
  throw new Error("يجب اختيار طاولة أو إدخال رقم يدوي");
}

function tableDisplayFromSession(session: TableSession) {
  return session.tableDisplayNumber || String(session.tableNumber);
}

function buildPreviousEntry(
  session: TableSession,
  staffName?: string | null
): PreviousTableEntry {
  return {
    tableNumber: session.tableNumber,
    tableDisplayNumber: session.tableDisplayNumber,
    tableLabel: session.tableLabel,
    tableZone: session.tableZone,
    tableIcon: session.tableIcon,
    movedAt: new Date().toISOString(),
    staffName: staffName ?? null,
  };
}

export async function updateTableSession(
  sessionId: string,
  restaurantId: string,
  input: SessionEditInput,
  staff: AuditStaff,
  role?: string | null
) {
  const session = await prisma.tableSession.findFirst({
    where: { id: sessionId, restaurantId },
  });
  if (!session) throw new Error("الجلسة غير موجودة");
  if (session.endedAt || session.status === "COMPLETED") {
    throw new Error("لا يمكن تعديل جلسة مغلقة");
  }

  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  const data: Record<string, unknown> = {};
  let targetTableId = session.tableId;
  let tableChanged = false;

  const scalarFields: (keyof SessionEditInput)[] = [
    "customerName",
    "customerPhone",
    "guestCount",
    "status",
  ];

  for (const field of scalarFields) {
    if (input[field] === undefined) continue;
    const oldVal = session[field as keyof TableSession];
    const newVal = input[field];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      changes.push({ field, oldValue: oldVal, newValue: newVal });
      data[field] = newVal;
    }
  }

  if (input.minimumSpendAmount !== undefined) {
    const newMin =
      input.minimumSpendAmount != null && input.minimumSpendAmount !== ""
        ? parseFloat(String(input.minimumSpendAmount))
        : null;
    const oldMin =
      session.minimumSpendAmount != null
        ? Number(session.minimumSpendAmount)
        : null;
    if (oldMin !== newMin) {
      changes.push({ field: "minimumSpendAmount", oldValue: oldMin, newValue: newMin });
      data.minimumSpendAmount = newMin;
    }
  }

  if (input.notes !== undefined) {
    const newNotes = input.appendNote && session.notes
      ? `${session.notes}\n${input.notes}`
      : input.notes || null;
    if ((session.notes ?? "") !== (newNotes ?? "")) {
      changes.push({ field: "notes", oldValue: session.notes, newValue: newNotes });
      data.notes = newNotes;
    }
  }

  const movingTable = Boolean(input.tableId || input.manualTable?.tableNumber != null);

  if (movingTable) {
    const targetTable = await resolveTargetTable(restaurantId, session.branchId, {
      tableId: input.tableId,
      manualTable: input.manualTable,
    });

    if (targetTable.id !== session.tableId) {
      const conflict = await checkTableSessionConflict(targetTable.id, sessionId);
      if (conflict) {
        if (!input.forceAssign) {
          const err = new Error("This table already has an active session.") as Error & {
            conflict: TableConflict;
          };
          err.conflict = {
            code: "TABLE_OCCUPIED",
            message: "This table already has an active session.",
            conflictSessionId: conflict.id,
            conflictCustomerName: conflict.customerName,
            conflictTableId: targetTable.id,
          };
          throw err;
        }
        if (!canForceAssign(role)) {
          throw new Error("تعيين إجباري متاح للمالك والمدير فقط");
        }
        await prisma.tableSession.update({
          where: { id: conflict.id },
          data: { status: "COMPLETED", endedAt: new Date(), notes: conflict.notes ? `${conflict.notes}\n[نقل إجباري]` : "[نقل إجباري]" },
        });
        await syncTableOperationalStatus(conflict.tableId);
        await logSessionChanges(
          restaurantId,
          conflict.id,
          [{ field: "status", oldValue: conflict.status, newValue: "COMPLETED (force)" }],
          staff
        );
      }

      if (session.customerVisitId) {
        await appendPreviousTable(
          session.customerVisitId,
          buildPreviousEntry(session, staff.name)
        );
      }

      await prisma.tableAssignment.create({
        data: {
          restaurantId,
          sessionId,
          type: "MOVE",
          fromTableId: session.tableId,
          toTableId: targetTable.id,
          staffName: staff.name ?? null,
          notes: input.manualTable
            ? `Manual: ${input.manualTable.tableNumber}`
            : null,
        },
      });

      const displayNum =
        input.manualTable?.tableNumber != null
          ? String(input.manualTable.tableNumber).trim()
          : String(targetTable.number);

      changes.push(
        { field: "tableId", oldValue: session.tableId, newValue: targetTable.id },
        { field: "tableNumber", oldValue: session.tableNumber, newValue: targetTable.number },
        {
          field: "tableDisplayNumber",
          oldValue: session.tableDisplayNumber,
          newValue: displayNum,
        },
        {
          field: "tableLabel",
          oldValue: session.tableLabel,
          newValue: input.manualTable?.label ?? targetTable.label,
        },
        {
          field: "tableZone",
          oldValue: session.tableZone,
          newValue: input.manualTable?.zone ?? targetTable.floorZone,
        }
      );

      data.tableId = targetTable.id;
      data.tableNumber = targetTable.number;
      data.tableDisplayNumber = displayNum;
      data.tableLabel = input.manualTable?.label?.trim() || targetTable.label;
      data.tableZone = input.manualTable?.zone?.trim() || targetTable.floorZone;
      data.tableIcon = (input.manualTable?.tableIcon as TableIcon) || targetTable.tableIcon;
      data.tableCapacity = targetTable.capacity;
      targetTableId = targetTable.id;
      tableChanged = true;

      if (session.customerVisitId) {
        await onTableAssigned({
          visitId: session.customerVisitId,
          restaurantId,
          branchId: session.branchId,
          tableId: targetTable.id,
          tableDisplayNumber: displayNum,
          staff: { userId: staff.userId, name: staff.name },
          previousTableId: session.tableId,
        });
      }
    } else if (input.manualTable) {
      const displayNum = String(input.manualTable.tableNumber).trim();
      const updates: Record<string, unknown> = {};
      if (displayNum && displayNum !== session.tableDisplayNumber) {
        changes.push({
          field: "tableDisplayNumber",
          oldValue: session.tableDisplayNumber,
          newValue: displayNum,
        });
        updates.tableDisplayNumber = displayNum;
      }
      if (input.manualTable.label !== undefined && input.manualTable.label !== session.tableLabel) {
        changes.push({
          field: "tableLabel",
          oldValue: session.tableLabel,
          newValue: input.manualTable.label,
        });
        updates.tableLabel = input.manualTable.label?.trim() || null;
      }
      if (input.manualTable.zone !== undefined && input.manualTable.zone !== session.tableZone) {
        changes.push({
          field: "tableZone",
          oldValue: session.tableZone,
          newValue: input.manualTable.zone,
        });
        updates.tableZone = input.manualTable.zone?.trim() || null;
      }
      Object.assign(data, updates);
    }
  }

  if (data.customerName || data.customerPhone) {
    const profile = await upsertCustomerProfile(
      restaurantId,
      String(data.customerName ?? session.customerName),
      (data.customerPhone as string) ?? session.customerPhone
    );
    const customerChanges = changes.filter((c) =>
      ["customerName", "customerPhone"].includes(c.field)
    );
    if (customerChanges.length > 0 && session.customerVisitId) {
      await onCustomerUpdated({
        visitId: session.customerVisitId,
        customerProfileId: profile.id,
        restaurantId,
        staff: { userId: staff.userId, name: staff.name },
        changes: customerChanges,
      });
    }
    if (session.customerVisitId) {
      await prisma.customerVisit.update({
        where: { id: session.customerVisitId },
        data: {
          customerName: String(data.customerName ?? session.customerName),
          customerPhone: (data.customerPhone as string) ?? session.customerPhone,
          customerProfileId: profile.id,
          ...(data.guestCount != null ? { guestCount: data.guestCount as number } : {}),
          ...(data.minimumSpendAmount !== undefined
            ? { minimumSpendAmount: data.minimumSpendAmount as number | null }
            : {}),
          ...(data.notes !== undefined ? { notes: data.notes as string | null } : {}),
          ...(tableChanged || data.tableNumber
            ? {
                tableNumber: (data.tableNumber as number) ?? session.tableNumber,
                tableDisplayNumber:
                  (data.tableDisplayNumber as string) ?? session.tableDisplayNumber,
                tableLabel: (data.tableLabel as string) ?? session.tableLabel,
                tableZone: (data.tableZone as string) ?? session.tableZone,
                tableIcon: (data.tableIcon as TableIcon) ?? session.tableIcon,
              }
            : {}),
        },
      });
    }
  } else if (session.customerVisitId && (tableChanged || Object.keys(data).length)) {
    await prisma.customerVisit.update({
      where: { id: session.customerVisitId },
      data: {
        ...(data.guestCount != null ? { guestCount: data.guestCount as number } : {}),
        ...(data.minimumSpendAmount !== undefined
          ? { minimumSpendAmount: data.minimumSpendAmount as number | null }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes as string | null } : {}),
        ...(tableChanged
          ? {
              tableNumber: data.tableNumber as number,
              tableDisplayNumber: data.tableDisplayNumber as string,
              tableLabel: data.tableLabel as string,
              tableZone: data.tableZone as string,
              tableIcon: data.tableIcon as TableIcon,
            }
          : {}),
      },
    });
  }

  const updated = await prisma.tableSession.update({
    where: { id: sessionId },
    data,
  });

  await logSessionChanges(restaurantId, sessionId, changes, staff);

  if (input.status && input.status !== session.status && session.customerVisitId) {
    await onSessionStatusChange({
      visitId: session.customerVisitId,
      restaurantId,
      branchId: session.branchId,
      sessionId,
      oldStatus: session.status,
      newStatus: input.status,
      staff: { userId: staff.userId, name: staff.name },
    });
  }

  if (tableChanged) {
    await syncTableOperationalStatus(session.tableId);
    await syncTableOperationalStatus(targetTableId);
  }

  return updated;
}

export { tableDisplayFromSession };
