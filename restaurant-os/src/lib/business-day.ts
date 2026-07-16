import { RIYADH_TZ } from "@/lib/timezone";

export type ReportPeriod =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last90"
  | "custom"
  | "";

export type BusinessDayConfig = {
  timezone: string;
  businessDayStartHour: number;
};

export const DEFAULT_BUSINESS_DAY_CONFIG: BusinessDayConfig = {
  timezone: RIYADH_TZ,
  businessDayStartHour: 4,
};

export const BUSINESS_DAY_NOTE_AR =
  "اليوم التشغيلي من 4:00 صباحًا حتى 3:59 صباحًا من اليوم التالي";

export type BusinessDayRange = {
  startUtc: Date;
  endUtc: Date;
  localStart: Date;
  localEnd: Date;
  businessDate: string;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

export function parseBusinessDate(businessDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const [y, m, d] = businessDate.split("-").map((v) => parseInt(v, 10));
  return { year: y, month: m, day: d };
}

export function formatBusinessDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour") % 24,
    minute: pick("minute"),
    second: pick("second"),
  };
}

function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string
): Date {
  const target = { year, month, day, hour, minute, second, ms };
  const approx = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  let lo = approx - 18 * 3600000;
  let hi = approx + 18 * 3600000;

  function compare(a: ZonedParts, b: typeof target): number {
    const keys: (keyof ZonedParts)[] = [
      "year",
      "month",
      "day",
      "hour",
      "minute",
      "second",
    ];
    for (const k of keys) {
      if (a[k] !== b[k]) return a[k] - b[k];
    }
    return 0;
  }

  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const p = getZonedParts(new Date(mid), timeZone);
    if (compare(p, target) < 0) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}

export function addCalendarDays(businessDate: string, offset: number): string {
  const { year, month, day } = parseBusinessDate(businessDate);
  const d = new Date(Date.UTC(year, month - 1, day + offset));
  return formatBusinessDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function currentBusinessDate(
  now: Date,
  timezone: string,
  businessDayStartHour: number
): string {
  const parts = getZonedParts(now, timezone);
  const today = formatBusinessDate(parts.year, parts.month, parts.day);
  if (parts.hour < businessDayStartHour) {
    return addCalendarDays(today, -1);
  }
  return today;
}

export function getBusinessDayRange({
  businessDate,
  timezone,
  businessDayStartHour = 4,
}: {
  businessDate: string;
  timezone: string;
  businessDayStartHour?: number;
}): BusinessDayRange {
  const { year, month, day } = parseBusinessDate(businessDate);
  const nextDate = addCalendarDays(businessDate, 1);
  const { year: ny, month: nm, day: nd } = parseBusinessDate(nextDate);

  const startUtc = zonedLocalToUtc(
    year,
    month,
    day,
    businessDayStartHour,
    0,
    0,
    0,
    timezone
  );
  const endUtc = zonedLocalToUtc(ny, nm, nd, businessDayStartHour, 0, 0, 0, timezone);
  endUtc.setMilliseconds(endUtc.getMilliseconds() - 1);

  return {
    startUtc,
    endUtc,
    localStart: startUtc,
    localEnd: endUtc,
    businessDate,
  };
}

export function resolveDateRange(
  preset?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null,
  config: BusinessDayConfig = DEFAULT_BUSINESS_DAY_CONFIG,
  now: Date = new Date()
): {
  from?: Date;
  to?: Date;
  period: ReportPeriod;
  businessDate?: string;
  businessDayNote: string;
  operationalPeriodLabel?: string;
} {
  const { timezone, businessDayStartHour } = config;
  const period = (preset || "") as ReportPeriod;
  const currentBd = currentBusinessDate(now, timezone, businessDayStartHour);

  const wrap = (from: Date, to: Date, businessDate?: string) => ({
    from,
    to,
    period,
    businessDate,
    businessDayNote: BUSINESS_DAY_NOTE_AR,
    operationalPeriodLabel: formatOperationalPeriodLabel(from, to, timezone),
  });

  switch (period) {
    case "today": {
      const range = getBusinessDayRange({
        businessDate: currentBd,
        timezone,
        businessDayStartHour,
      });
      return wrap(range.startUtc, range.endUtc, currentBd);
    }
    case "yesterday": {
      const bd = addCalendarDays(currentBd, -1);
      const range = getBusinessDayRange({
        businessDate: bd,
        timezone,
        businessDayStartHour,
      });
      return wrap(range.startUtc, range.endUtc, bd);
    }
    case "last7": {
      const startBd = addCalendarDays(currentBd, -6);
      const start = getBusinessDayRange({
        businessDate: startBd,
        timezone,
        businessDayStartHour,
      }).startUtc;
      const end = getBusinessDayRange({
        businessDate: currentBd,
        timezone,
        businessDayStartHour,
      }).endUtc;
      return wrap(start, end, currentBd);
    }
    case "last30": {
      const startBd = addCalendarDays(currentBd, -29);
      const start = getBusinessDayRange({
        businessDate: startBd,
        timezone,
        businessDayStartHour,
      }).startUtc;
      const end = getBusinessDayRange({
        businessDate: currentBd,
        timezone,
        businessDayStartHour,
      }).endUtc;
      return wrap(start, end, currentBd);
    }
    case "last90": {
      const { year, month } = parseBusinessDate(currentBd);
      let startMonth = month - 2;
      let startYear = year;
      while (startMonth <= 0) {
        startMonth += 12;
        startYear -= 1;
      }
      const startBd = formatBusinessDate(startYear, startMonth, 1);
      const start = getBusinessDayRange({
        businessDate: startBd,
        timezone,
        businessDayStartHour,
      }).startUtc;
      const end = getBusinessDayRange({
        businessDate: currentBd,
        timezone,
        businessDayStartHour,
      }).endUtc;
      return wrap(start, end, currentBd);
    }
    case "custom": {
      if (dateFrom && dateTo) {
        const start = getBusinessDayRange({
          businessDate: dateFrom,
          timezone,
          businessDayStartHour,
        }).startUtc;
        const end = getBusinessDayRange({
          businessDate: dateTo,
          timezone,
          businessDayStartHour,
        }).endUtc;
        return wrap(start, end, dateTo);
      }
      if (dateFrom) {
        const range = getBusinessDayRange({
          businessDate: dateFrom,
          timezone,
          businessDayStartHour,
        });
        return wrap(range.startUtc, range.endUtc, dateFrom);
      }
      return {
        period,
        businessDayNote: BUSINESS_DAY_NOTE_AR,
      };
    }
    default:
      return {
        from: dateFrom
          ? getBusinessDayRange({
              businessDate: dateFrom,
              timezone,
              businessDayStartHour,
            }).startUtc
          : undefined,
        to: dateTo
          ? getBusinessDayRange({
              businessDate: dateTo,
              timezone,
              businessDayStartHour,
            }).endUtc
          : undefined,
        period: "",
        businessDayNote: BUSINESS_DAY_NOTE_AR,
        ...(dateFrom && dateTo
          ? {
              operationalPeriodLabel: formatOperationalPeriodLabel(
                getBusinessDayRange({
                  businessDate: dateFrom,
                  timezone,
                  businessDayStartHour,
                }).startUtc,
                getBusinessDayRange({
                  businessDate: dateTo,
                  timezone,
                  businessDayStartHour,
                }).endUtc,
                timezone
              ),
            }
          : {}),
      };
  }
}

export function formatOperationalPeriodLabel(
  from: Date,
  to: Date,
  timezone: string
): string {
  const fmt = (d: Date) =>
    d.toLocaleString("ar-SA", {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  return `الفترة التشغيلية:\n${fmt(from)}\nإلى\n${fmt(to)}`;
}

export function businessDateForTimestamp(
  at: Date,
  timezone: string,
  businessDayStartHour: number
): string {
  const parts = getZonedParts(at, timezone);
  const calendarDate = formatBusinessDate(parts.year, parts.month, parts.day);
  if (parts.hour < businessDayStartHour) {
    return addCalendarDays(calendarDate, -1);
  }
  return calendarDate;
}

export function isTimestampInRange(at: Date, from?: Date, to?: Date): boolean {
  if (from && at < from) return false;
  if (to && at > to) return false;
  return true;
}

/** @deprecated use getBusinessDayRange — kept for gradual migration */
export function startOfRiyadhDay(d: Date = new Date()): Date {
  const bd = currentBusinessDate(d, RIYADH_TZ, 4);
  return getBusinessDayRange({
    businessDate: bd,
    timezone: RIYADH_TZ,
    businessDayStartHour: 4,
  }).startUtc;
}

/** @deprecated use getBusinessDayRange */
export function endOfRiyadhDay(d: Date = new Date()): Date {
  const bd = currentBusinessDate(d, RIYADH_TZ, 4);
  return getBusinessDayRange({
    businessDate: bd,
    timezone: RIYADH_TZ,
    businessDayStartHour: 4,
  }).endUtc;
}
