export type GuestCountSource = "visit" | "reservation" | "session" | "default" | "unknown";

export type GuestCountInput = {
  visitGuestCount?: number | null;
  reservationGuestCount?: number | null;
  sessionGuestCount?: number | null;
  actualArrivedGuestCount?: number | null;
};

export type GroupSizeMetrics = {
  guestCount: number | null;
  companionsCount: number | null;
  totalPeople: number | null;
  guestCountUnknown: boolean;
  guestCountSource: GuestCountSource;
};

export function computeGroupSizeMetrics(guestCount: number): Omit<GroupSizeMetrics, "guestCountUnknown" | "guestCountSource"> {
  const count = Math.max(1, Math.floor(guestCount));
  return {
    guestCount: count,
    companionsCount: Math.max(count - 1, 0),
    totalPeople: count,
  };
}

/**
 * Authoritative guest count priority:
 * 1. visit.guestCount (>1 is always explicit; 1 may be solo or legacy default)
 * 2. reservation actualArrivedGuestCount (confirmed at reception, does not overwrite planned count)
 * 3. reservation.guestCount when visit still at legacy default 1
 * 4. tableSession.guestCount
 * 5. unknown when no reliable value
 */
export function resolveAuthoritativeGuestCount(
  input: GuestCountInput
): GroupSizeMetrics {
  if (input.visitGuestCount != null && input.visitGuestCount > 1) {
    return {
      ...computeGroupSizeMetrics(input.visitGuestCount),
      guestCountUnknown: false,
      guestCountSource: "visit",
    };
  }

  if (input.actualArrivedGuestCount != null && input.actualArrivedGuestCount >= 1) {
    return {
      ...computeGroupSizeMetrics(input.actualArrivedGuestCount),
      guestCountUnknown: false,
      guestCountSource: "reservation",
    };
  }

  if (input.visitGuestCount === 1) {
    if (!input.reservationGuestCount || input.reservationGuestCount <= 1) {
      return {
        ...computeGroupSizeMetrics(1),
        guestCountUnknown: false,
        guestCountSource: "visit",
      };
    }
    return {
      ...computeGroupSizeMetrics(input.reservationGuestCount),
      guestCountUnknown: false,
      guestCountSource: "reservation",
    };
  }

  if (input.reservationGuestCount != null && input.reservationGuestCount >= 1) {
    return {
      ...computeGroupSizeMetrics(input.reservationGuestCount),
      guestCountUnknown: false,
      guestCountSource: "reservation",
    };
  }

  if (input.sessionGuestCount != null && input.sessionGuestCount >= 1) {
    return {
      ...computeGroupSizeMetrics(input.sessionGuestCount),
      guestCountUnknown: false,
      guestCountSource: "session",
    };
  }

  return {
    guestCount: null,
    companionsCount: null,
    totalPeople: null,
    guestCountUnknown: true,
    guestCountSource: "unknown",
  };
}

export function resolveGuestCountWithDefault(input: GuestCountInput): GroupSizeMetrics {
  const resolved = resolveAuthoritativeGuestCount(input);
  if (!resolved.guestCountUnknown) return resolved;
  return {
    ...computeGroupSizeMetrics(1),
    guestCountUnknown: false,
    guestCountSource: "default",
  };
}

export function sumVenuePeople(rows: { totalPeople: number | null; guestCountUnknown?: boolean }[]) {
  let totalPeople = 0;
  let totalCompanions = 0;
  let registeredCustomers = 0;
  let unknownVisits = 0;

  for (const row of rows) {
    if (row.guestCountUnknown || row.totalPeople == null) {
      unknownVisits++;
      continue;
    }
    registeredCustomers += 1;
    totalPeople += row.totalPeople;
    totalCompanions += Math.max(row.totalPeople - 1, 0);
  }

  return {
    registeredCustomers,
    totalCompanions,
    totalVenueVisitors: totalPeople,
    unknownVisits,
  };
}
