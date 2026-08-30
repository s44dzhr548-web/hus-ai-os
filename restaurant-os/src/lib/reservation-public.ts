import { randomBytes } from "crypto";
import type { ReservationStatus } from "@prisma/client";
import { PERMANENT_QR_BASE_URL } from "@/lib/permanent-qr";

export type CustomerReservationPhase =
  | "PENDING"
  | "CONFIRMED"
  | "TABLE_ASSIGNED"
  | "SEATED"
  | "COMPLETED"
  | "CANCELLED";

const PHASE_LABELS_AR: Record<CustomerReservationPhase, string> = {
  PENDING: "بانتظار تأكيد المطعم",
  CONFIRMED: "تم تأكيد حجزك ✅",
  TABLE_ASSIGNED: "تم تخصيص طاولتك",
  SEATED: "تم تسجيل جلوسك",
  COMPLETED: "تمت الزيارة بنجاح",
  CANCELLED: "تم إلغاء الحجز",
};

export function generateReservationPublicToken(): string {
  return randomBytes(18).toString("base64url");
}

export function reservationPublicUrl(token: string): string {
  return `${PERMANENT_QR_BASE_URL}/reservation/${token}`;
}

export function customerReservationPhase(input: {
  status: ReservationStatus;
  tableId: string | null;
  tableNumber: number | null;
}): CustomerReservationPhase {
  const { status, tableId } = input;
  if (status === "CANCELLED" || status === "REJECTED") return "CANCELLED";
  if (status === "COMPLETED") return "COMPLETED";
  if (["SEATED", "CHECKED_IN", "ARRIVED", "CONVERTED"].includes(status)) return "SEATED";
  if (tableId && (status === "CONFIRMED" || status === "APPROVED")) return "TABLE_ASSIGNED";
  if (status === "CONFIRMED" || status === "APPROVED") return "CONFIRMED";
  return "PENDING";
}

export function customerPhaseLabel(
  phase: CustomerReservationPhase,
  tableNumber: number | null | undefined
): string {
  if (phase === "TABLE_ASSIGNED" && tableNumber != null) {
    return `تم تخصيص طاولتك — طاولة رقم ${tableNumber}`;
  }
  if (phase === "SEATED" && tableNumber != null) {
    return `تم تسجيل جلوسك على طاولة رقم ${tableNumber}`;
  }
  return PHASE_LABELS_AR[phase];
}

export function sessionTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const map: Record<string, string> = {
    INDOOR: "داخلية",
    OUTDOOR: "خارجية",
    NO_PREFERENCE: "بدون تفضيل",
  };
  return map[value] ?? value;
}

export function isReservationEditableByCustomer(status: ReservationStatus): boolean {
  return status === "PENDING";
}

export type PublicReservationView = {
  token: string;
  reservationNumber: string | null;
  phase: CustomerReservationPhase;
  phaseLabel: string;
  status: ReservationStatus;
  customerName: string;
  customerPhone: string;
  date: string;
  dateDisplay: string;
  time: string;
  guestCount: number;
  sessionType: string | null;
  sessionTypeLabel: string | null;
  notes: string | null;
  occasion: string | null;
  tableNumber: number | null;
  tableLabel: string | null;
  minimumSpendAmount: number | null;
  canEdit: boolean;
  canCancel: boolean;
  restaurantName: string;
  restaurantSlug: string;
  updatedAt: string;
};

export function serializePublicReservation(
  r: {
    publicAccessToken: string | null;
    reservationNumber: string | null;
    status: ReservationStatus;
    customerName: string;
    customerPhone: string;
    date: Date;
    time: string;
    guestCount: number;
    sessionType: string | null;
    notes: string | null;
    occasion: string | null;
    tableId: string | null;
    tableNumber: number | null;
    tableLabel: string | null;
    minimumSpendAmount: unknown;
    updatedAt: Date;
  },
  restaurant: { name: string; nameAr: string | null; slug: string }
): PublicReservationView | null {
  if (!r.publicAccessToken) return null;
  const phase = customerReservationPhase(r);
  const dateIso = r.date.toISOString().slice(0, 10);
  return {
    token: r.publicAccessToken,
    reservationNumber: r.reservationNumber,
    phase,
    phaseLabel: customerPhaseLabel(phase, r.tableNumber),
    status: r.status,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    date: dateIso,
    dateDisplay: r.date.toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh" }),
    time: r.time,
    guestCount: r.guestCount,
    sessionType: r.sessionType,
    sessionTypeLabel: sessionTypeLabel(r.sessionType),
    notes: r.notes,
    occasion: r.occasion,
    tableNumber: r.tableNumber,
    tableLabel: r.tableLabel,
    minimumSpendAmount:
      r.minimumSpendAmount != null ? Number(r.minimumSpendAmount) : null,
    canEdit: isReservationEditableByCustomer(r.status),
    canCancel: isReservationEditableByCustomer(r.status),
    restaurantName: restaurant.nameAr || restaurant.name,
    restaurantSlug: restaurant.slug,
    updatedAt: r.updatedAt.toISOString(),
  };
}
