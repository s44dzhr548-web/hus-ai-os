import { logAudit } from "@/lib/audit";

export type TableAuditAction =
  | "TABLE_CREATE"
  | "TABLE_UPDATE"
  | "TABLE_ARCHIVE"
  | "TABLE_RESTORE"
  | "TABLE_DUPLICATE"
  | "TABLE_RENUMBER"
  | "TABLE_BULK"
  | "TABLE_IMPORT"
  | "TABLE_QR_REGENERATE";

export async function logTableAudit(params: {
  restaurantId: string;
  userId: string;
  action: TableAuditAction;
  tableId?: string;
  previous?: Record<string, unknown>;
  next?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  await logAudit({
    restaurantId: params.restaurantId,
    userId: params.userId,
    action: params.action,
    entity: "DiningTable",
    entityId: params.tableId,
    metadata: {
      previous: params.previous,
      next: params.next,
      ...params.metadata,
      at: new Date().toISOString(),
    },
  });
}

export function tableSnapshot(table: {
  id: string;
  number: number;
  label?: string | null;
  tableCode?: string | null;
  floorZone?: string | null;
  isActive?: boolean;
  isArchived?: boolean;
  sortOrder?: number;
  capacity?: number;
}) {
  return {
    id: table.id,
    number: table.number,
    label: table.label,
    tableCode: table.tableCode,
    floorZone: table.floorZone,
    isActive: table.isActive,
    isArchived: table.isArchived,
    sortOrder: table.sortOrder,
    capacity: table.capacity,
  };
}
