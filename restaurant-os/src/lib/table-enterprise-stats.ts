import type { TableOperationalStatus } from "@prisma/client";

export interface EnterpriseTableStats {
  total: number;
  active: number;
  disabled: number;
  archived: number;
  occupied: number;
  free: number;
  reserved: number;
  qrGenerated: number;
  missingQr: number;
}

export function computeEnterpriseStats(
  tables: Array<{
    isActive: boolean;
    isArchived?: boolean;
    qrCode?: string | null;
    operationalStatus?: TableOperationalStatus | string;
  }>
): EnterpriseTableStats {
  const visible = tables.filter((t) => !t.isArchived);
  return {
    total: visible.length,
    active: visible.filter((t) => t.isActive).length,
    disabled: visible.filter((t) => !t.isActive).length,
    archived: tables.filter((t) => t.isArchived).length,
    occupied: visible.filter((t) => t.operationalStatus === "OCCUPIED").length,
    free: visible.filter(
      (t) => t.operationalStatus === "AVAILABLE" || !t.operationalStatus
    ).length,
    reserved: visible.filter((t) => t.operationalStatus === "RESERVED").length,
    qrGenerated: visible.filter((t) => !!t.qrCode).length,
    missingQr: visible.filter((t) => !t.qrCode).length,
  };
}

export type TableFilterKey =
  | "all"
  | "active"
  | "disabled"
  | "occupied"
  | "free"
  | "reserved"
  | "qr"
  | "no-qr"
  | "archived";

export function filterTables<T extends {
  isActive: boolean;
  isArchived?: boolean;
  qrCode?: string | null;
  operationalStatus?: string;
  number: number;
  label?: string | null;
  floorZone?: string | null;
}>(
  tables: T[],
  opts: { search?: string; area?: string; filter?: TableFilterKey }
): T[] {
  let list = [...tables];
  const q = opts.search?.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (t) =>
        String(t.number).includes(q) ||
        (t.label || "").toLowerCase().includes(q) ||
        (t.floorZone || "").toLowerCase().includes(q)
    );
  }
  if (opts.area) list = list.filter((t) => t.floorZone === opts.area);
  switch (opts.filter) {
    case "active":
      list = list.filter((t) => t.isActive && !t.isArchived);
      break;
    case "disabled":
      list = list.filter((t) => !t.isActive && !t.isArchived);
      break;
    case "occupied":
      list = list.filter((t) => t.operationalStatus === "OCCUPIED");
      break;
    case "free":
      list = list.filter(
        (t) => t.operationalStatus === "AVAILABLE" || !t.operationalStatus
      );
      break;
    case "reserved":
      list = list.filter((t) => t.operationalStatus === "RESERVED");
      break;
    case "qr":
      list = list.filter((t) => !!t.qrCode);
      break;
    case "no-qr":
      list = list.filter((t) => !t.qrCode);
      break;
    case "archived":
      list = list.filter((t) => t.isArchived);
      break;
    default:
      break;
  }
  return list;
}
