import { parseWorkingHours } from "@/lib/working-hours";

type DayHours = { open: string; close: string; closed?: boolean };
type WorkingHoursMap = Record<string, DayHours>;

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function parseHm(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function formatHm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dayKeyForDate(dateStr: string, timezone = "Asia/Riyadh"): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: timezone })
    .format(d)
    .toLowerCase();
  return day;
}

function todayDateStr(timezone = "Asia/Riyadh"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

function nowMinutes(timezone = "Asia/Riyadh"): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export type ReservationSlot = {
  time: string;
  label: string;
  available: boolean;
};

const DEFAULT_WORKING_HOURS: WorkingHoursMap = {
  sunday: { open: "12:00", close: "23:30" },
  monday: { open: "12:00", close: "23:30" },
  tuesday: { open: "12:00", close: "23:30" },
  wednesday: { open: "12:00", close: "23:30" },
  thursday: { open: "12:00", close: "23:30" },
  friday: { open: "14:00", close: "23:30" },
  saturday: { open: "12:00", close: "23:30" },
};

export function buildReservationSlots(params: {
  workingHoursRaw: unknown;
  date: string;
  timezone?: string;
  intervalMinutes?: number;
  bookedTimes?: string[];
  maxPerSlot?: number;
}): ReservationSlot[] {
  const timezone = params.timezone || "Asia/Riyadh";
  const hours = parseWorkingHours(params.workingHoursRaw) ?? DEFAULT_WORKING_HOURS;

  const dayKey = dayKeyForDate(params.date, timezone) as (typeof DAY_KEYS)[number];
  const day = hours[dayKey];
  if (!day || day.closed) return [];

  const openMin = parseHm(day.open);
  const closeMin = parseHm(day.close);
  if (openMin == null || closeMin == null || closeMin <= openMin) return [];

  const interval = params.intervalMinutes ?? 30;
  const booked = params.bookedTimes ?? [];
  const maxPerSlot = params.maxPerSlot ?? 99;
  const isToday = params.date === todayDateStr(timezone);
  const currentMin = isToday ? nowMinutes(timezone) : -1;

  const slots: ReservationSlot[] = [];
  for (let t = openMin; t + interval <= closeMin; t += interval) {
    const time = formatHm(t);
    const count = booked.filter((b) => b === time).length;
    const past = isToday && t <= currentMin;
    const full = count >= maxPerSlot;
    slots.push({
      time,
      label: time,
      available: !past && !full,
    });
  }
  return slots;
}

export function isPastDate(dateStr: string, timezone = "Asia/Riyadh"): boolean {
  return dateStr < todayDateStr(timezone);
}

export function maxGuestCountFromConfig(raw: unknown, fallback = 20): number {
  if (!raw || typeof raw !== "object") return fallback;
  const cfg = raw as Record<string, unknown>;
  const n = Number(cfg.maxReservationGuests ?? cfg.maxGuestCount ?? cfg.maxGuests);
  if (Number.isFinite(n) && n >= 1) return Math.min(Math.floor(n), 100);
  return fallback;
}
