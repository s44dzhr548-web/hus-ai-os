import type { Prisma } from "@prisma/client";
import { getZonedParts, isTimestampInRange } from "@/lib/business-day";

export type ActualEntryInput = {
  id: string;
  /** visit.checkedInAt — stored as enteredAt on CustomerVisit */
  enteredAt?: Date | null;
  createdAt: Date;
  tableSessions?: { id: string; startedAt: Date }[];
  reservation?: { arrivedAt?: Date | null } | null;
};

/**
 * Authoritative customer entry time priority:
 * 1. visit check-in (enteredAt)
 * 2. reservation.arrivedAt
 * 3. tableSession.startedAt (earliest)
 * 4. visit.createdAt (legacy fallback)
 */
export function resolveActualEntryAt(input: ActualEntryInput): Date | null {
  if (input.enteredAt) return input.enteredAt;
  if (input.reservation?.arrivedAt) return input.reservation.arrivedAt;
  const sessions = input.tableSessions ?? [];
  if (sessions.length > 0) {
    return sessions.reduce(
      (earliest, s) => (s.startedAt < earliest ? s.startedAt : earliest),
      sessions[0].startedAt
    );
  }
  return input.createdAt ?? null;
}

export function isAfterMidnightEntry(
  at: Date,
  timezone: string,
  businessDayStartHour: number
): boolean {
  const { hour } = getZonedParts(at, timezone);
  return hour >= 0 && hour < businessDayStartHour;
}

export function filterByActualEntry<T extends ActualEntryInput>(
  rows: T[],
  from?: Date,
  to?: Date
): (T & { actualEntryAt: Date })[] {
  const result: (T & { actualEntryAt: Date })[] = [];
  const seenVisitIds = new Set<string>();

  for (const row of rows) {
    if (seenVisitIds.has(row.id)) continue;
    const actualEntryAt = resolveActualEntryAt(row);
    if (!actualEntryAt) continue;
    if (!isTimestampInRange(actualEntryAt, from, to)) continue;
    seenVisitIds.add(row.id);
    result.push({ ...row, actualEntryAt });
  }
  return result;
}

export function actualEntryBroadWhere(
  from?: Date,
  to?: Date
): Prisma.CustomerVisitWhereInput | undefined {
  if (!from && !to) return undefined;
  const range = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
  return {
    OR: [
      { enteredAt: range },
      { createdAt: range },
      { tableSessions: { some: { startedAt: range } } },
    ],
  };
}
