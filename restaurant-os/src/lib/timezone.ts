const RIYADH_TZ = "Asia/Riyadh";
const LEGACY_UNAVAILABLE = "غير متوفر — سجل قديم";

export { LEGACY_UNAVAILABLE, RIYADH_TZ };

export function formatRiyadhDate(iso?: string | Date | null): string {
  if (!iso) return LEGACY_UNAVAILABLE;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return LEGACY_UNAVAILABLE;
  return d.toLocaleDateString("ar-SA", {
    timeZone: RIYADH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatRiyadhTime(iso?: string | Date | null): string {
  if (!iso) return LEGACY_UNAVAILABLE;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return LEGACY_UNAVAILABLE;
  return d.toLocaleTimeString("ar-SA", {
    timeZone: RIYADH_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatRiyadhDateTime(iso?: string | Date | null): string {
  if (!iso) return LEGACY_UNAVAILABLE;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return LEGACY_UNAVAILABLE;
  return d.toLocaleString("ar-SA", {
    timeZone: RIYADH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDurationMinutes(minutes?: number | null): string {
  if (minutes == null || minutes < 0) return LEGACY_UNAVAILABLE;
  if (minutes === 0) return "0 دقيقة";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} دقيقة`;
  if (m === 0) return h === 1 ? "ساعة واحدة" : `${h} ساعات`;
  const hourPart = h === 1 ? "ساعة" : `${h} ساعات`;
  const minPart = m === 1 ? "دقيقة" : `${m} دقيقة`;
  return `${hourPart} ${minPart}`;
}

export function computeDurationMinutes(from?: Date | null, to?: Date | null): number | null {
  if (!from || !to) return null;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

export function visitDateFromUtc(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}
