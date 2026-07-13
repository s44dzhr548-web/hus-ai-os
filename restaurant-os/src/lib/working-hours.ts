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

const DAY_LABELS_AR: Record<string, string> = {
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",
};

function todayKey(timezone = "Asia/Riyadh"): string {
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: timezone,
  })
    .format(new Date())
    .toLowerCase();
  return day;
}

export function parseWorkingHours(raw: unknown): WorkingHoursMap | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as WorkingHoursMap;
}

export function formatTodayHours(
  raw: unknown,
  locale: "ar" | "en" = "ar",
  timezone = "Asia/Riyadh"
): string | null {
  const hours = parseWorkingHours(raw);
  if (!hours) return null;

  const key = todayKey(timezone);
  const today = hours[key];
  if (!today) return null;
  if (today.closed) return locale === "ar" ? "مغلق اليوم" : "Closed today";

  return locale === "ar"
    ? `${today.open} – ${today.close}`
    : `${today.open} – ${today.close}`;
}

export function formatWorkingHoursSummary(
  raw: unknown,
  locale: "ar" | "en" = "ar"
): string | null {
  const hours = parseWorkingHours(raw);
  if (!hours) return null;

  const lines = DAY_KEYS.map((key) => {
    const h = hours[key];
    if (!h) return null;
    const label = locale === "ar" ? DAY_LABELS_AR[key] : key;
    if (h.closed) return `${label}: ${locale === "ar" ? "مغلق" : "Closed"}`;
    return `${label}: ${h.open} – ${h.close}`;
  }).filter(Boolean);

  return lines.length ? lines.join("\n") : null;
}
