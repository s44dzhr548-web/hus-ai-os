import type { ReservationStatus } from "@prisma/client";

/** Roles allowed to see full mobile numbers */
export const PHONE_VISIBLE_ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "WAITER",
] as const;

export function canViewCustomerPhone(role?: string | null): boolean {
  if (!role) return false;
  return (PHONE_VISIBLE_ROLES as readonly string[]).includes(role);
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  if (phone.length <= 4) return "****";
  return `${phone.slice(0, 3)}****${phone.slice(-2)}`;
}

export function applyPhonePrivacy<T extends { customerPhone?: string | null }>(
  row: T,
  role?: string | null
): T {
  if (canViewCustomerPhone(role)) return row;
  return { ...row, customerPhone: maskPhone(row.customerPhone) };
}

export type DatePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last90"
  | "custom";

export {
  resolveDateRange,
  reportPeriodLabels,
  startOfRiyadhDay,
  endOfRiyadhDay,
  getBusinessDayRange,
  currentBusinessDate,
  BUSINESS_DAY_NOTE_AR,
  formatOperationalPeriodLabel,
  buildCustomerReports,
  isQaTestRecord,
  resolveActualEntryAt,
  filterByActualEntry,
} from "@/lib/customer-reports";
export type { ReportPeriod } from "@/lib/customer-reports";
export type { BusinessDayConfig } from "@/lib/business-day";

export function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
  ];
  return "\uFEFF" + lines.join("\r\n");
}

export function computeFavoriteTable(
  visits: { tableNumber?: number | null; tableLabel?: string | null; tableZone?: string | null }[]
): { number: number | null; label: string | null; zone: string | null } {
  const counts = new Map<number, number>();
  const labels = new Map<number, string>();
  const zones = new Map<number, string>();
  for (const v of visits) {
    if (v.tableNumber == null) continue;
    counts.set(v.tableNumber, (counts.get(v.tableNumber) ?? 0) + 1);
    if (v.tableLabel) labels.set(v.tableNumber, v.tableLabel);
    if (v.tableZone) zones.set(v.tableNumber, v.tableZone);
  }
  let best: number | null = null;
  let max = 0;
  for (const [table, count] of counts) {
    if (count > max) {
      max = count;
      best = table;
    }
  }
  return {
    number: best,
    label: best != null ? labels.get(best) ?? null : null,
    zone: best != null ? zones.get(best) ?? null : null,
  };
}

export function computeFavoriteArea(
  visits: { tableZone?: string | null }[]
): string | null {
  const counts = new Map<string, number>();
  for (const v of visits) {
    if (!v.tableZone) continue;
    counts.set(v.tableZone, (counts.get(v.tableZone) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [zone, count] of counts) {
    if (count > max) {
      max = count;
      best = zone;
    }
  }
  return best;
}

export const VISIT_STATUS_LABELS: Record<string, string> = {
  REGISTERED: "مسجّل",
  WAITING: "في الانتظار",
  SEATED: "جالس",
  ACTIVE: "نشطة",
  COMPLETED: "مكتملة",
  CANCELLED: "ملغاة",
  NO_SHOW: "لم يحضر",
};

export const RESERVATION_HISTORY_STATUSES: ReservationStatus[] = [
  "PENDING",
  "APPROVED",
  "CONFIRMED",
  "REJECTED",
  "ARRIVED",
  "SEATED",
  "COMPLETED",
  "CANCELLED",
  "CONVERTED",
  "NO_SHOW",
];
