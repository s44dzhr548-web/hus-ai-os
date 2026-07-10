import prisma from "@/lib/prisma";

export type AuditStaff = {
  userId?: string | null;
  name?: string | null;
};

export type PreviousTableEntry = {
  tableNumber: number;
  tableDisplayNumber?: string | null;
  tableLabel?: string | null;
  tableZone?: string | null;
  tableIcon?: string | null;
  movedAt: string;
  staffName?: string | null;
};

function serializeValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export async function logSessionChanges(
  restaurantId: string,
  sessionId: string,
  changes: { field: string; oldValue: unknown; newValue: unknown }[],
  staff: AuditStaff
) {
  if (!changes.length) return [];
  return prisma.sessionAuditLog.createMany({
    data: changes.map((c) => ({
      restaurantId,
      sessionId,
      field: c.field,
      oldValue: serializeValue(c.oldValue),
      newValue: serializeValue(c.newValue),
      staffUserId: staff.userId ?? null,
      staffName: staff.name ?? null,
    })),
  });
}

export async function getSessionAuditLogs(sessionId: string, limit = 50) {
  const logs = await prisma.sessionAuditLog.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return logs.map((l) => ({
    id: l.id,
    field: l.field,
    oldValue: l.oldValue,
    newValue: l.newValue,
    staffName: l.staffName,
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function appendPreviousTable(
  visitId: string,
  entry: PreviousTableEntry
) {
  const visit = await prisma.customerVisit.findUnique({
    where: { id: visitId },
    select: { previousTables: true },
  });
  if (!visit) return;

  const existing = Array.isArray(visit.previousTables)
    ? (visit.previousTables as PreviousTableEntry[])
    : [];

  await prisma.customerVisit.update({
    where: { id: visitId },
    data: {
      previousTables: [...existing, entry] as never,
    },
  });
}

export const AUDIT_FIELD_LABELS: Record<string, string> = {
  customerName: "اسم العميل",
  customerPhone: "الجوال",
  guestCount: "عدد الضيوف",
  minimumSpendAmount: "الحد الأدنى",
  notes: "ملاحظات",
  status: "الحالة",
  tableNumber: "رقم الطاولة",
  tableDisplayNumber: "رقم/معرف الطاولة",
  tableLabel: "تسمية الطاولة",
  tableZone: "منطقة الطاولة",
  tableId: "الطاولة",
};
