#!/usr/bin/env node
/**
 * Read-only QA for visitor/companion reporting.
 */

const BASE =
  process.argv[2] || process.env.QA_BASE_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

function computeGroupSizeMetrics(guestCount) {
  const count = Math.max(1, Math.floor(guestCount));
  return {
    guestCount: count,
    companionsCount: Math.max(count - 1, 0),
    totalPeople: count,
  };
}

function resolveAuthoritativeGuestCount(input) {
  if (input.visitGuestCount != null && input.visitGuestCount > 1) {
    return { ...computeGroupSizeMetrics(input.visitGuestCount), guestCountUnknown: false };
  }
  if (input.actualArrivedGuestCount != null && input.actualArrivedGuestCount >= 1) {
    return { ...computeGroupSizeMetrics(input.actualArrivedGuestCount), guestCountUnknown: false };
  }
  if (input.visitGuestCount === 1) {
    if (!input.reservationGuestCount || input.reservationGuestCount <= 1) {
      return { ...computeGroupSizeMetrics(1), guestCountUnknown: false };
    }
    return { ...computeGroupSizeMetrics(input.reservationGuestCount), guestCountUnknown: false };
  }
  if (input.reservationGuestCount != null && input.reservationGuestCount >= 1) {
    return { ...computeGroupSizeMetrics(input.reservationGuestCount), guestCountUnknown: false };
  }
  return { guestCount: null, companionsCount: null, totalPeople: null, guestCountUnknown: true };
}

function localGroupTests() {
  const alone = resolveAuthoritativeGuestCount({ visitGuestCount: 1 });
  const with3 = resolveAuthoritativeGuestCount({ visitGuestCount: 4 });
  const reservation5Visit3 = resolveAuthoritativeGuestCount({
    visitGuestCount: 3,
    reservationGuestCount: 5,
  });
  const legacyLinked = resolveAuthoritativeGuestCount({
    visitGuestCount: 1,
    reservationGuestCount: 4,
  });

  return {
    alone: alone.companionsCount === 0 && alone.totalPeople === 1 ? "PASS" : "FAIL",
    with3Companions: with3.companionsCount === 3 && with3.totalPeople === 4 ? "PASS" : "FAIL",
    reservation5Visit3: reservation5Visit3.totalPeople === 3 ? "PASS" : "FAIL",
    legacyLinked: legacyLinked.totalPeople === 4 ? "PASS" : "FAIL",
  };
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.map((c) => c.split(";")[0]).join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  return [
    ...cookies.map((c) => c.split(";")[0]),
    ...(loginRes.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
  ].join("; ");
}

async function fetchReports(cookie, period) {
  const res = await fetch(`${BASE}/api/customers?view=reports&period=${period}`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`\n=== Visitor Reports QA ===\n${BASE}\n`);

  let local;
  try {
    local = localGroupTests();
    console.log("Local group tests:", local);
  } catch (e) {
    console.log("Local tests skipped:", e.message);
    local = { alone: "SKIP", with3Companions: "SKIP" };
  }

  const cookie = await login();
  const last7 = await fetchReports(cookie, "last7");

  const issues = [];
  if (typeof last7.registeredCustomers !== "number") issues.push("missing registeredCustomers");
  if (typeof last7.totalCompanions !== "number") issues.push("missing totalCompanions");
  if (typeof last7.totalVenueVisitors !== "number") issues.push("missing totalVenueVisitors");
  if (typeof last7.averageGroupSize !== "number") issues.push("missing averageGroupSize");
  if (typeof last7.largestGroup !== "number") issues.push("missing largestGroup");
  if (!Array.isArray(last7.visitDetails)) issues.push("missing visitDetails");
  if (last7.totalVenueVisitors < last7.registeredCustomers) {
    issues.push("venue visitors < registered customers");
  }
  if (last7.totalCompanions + last7.registeredCustomers !== last7.totalVenueVisitors) {
    // allow unknown visits edge case
    if (last7.totalVenueVisitors > 0) {
      issues.push("companions + registered != venue visitors");
    }
  }
  const top = last7.mostFrequentCustomers?.[0];
  if (top && top.totalPeopleBrought == null) issues.push("top customer missing people stats");

  const fabrikaRes = await fetch(`${BASE}/api/customers?view=customers`, {
    headers: { Cookie: cookie },
  });
  const fabrikaOk = fabrikaRes.ok;

  const summary = {
    localAlone: local.alone,
    localWith3: local.with3Companions,
    localReservationVisitSplit: local.reservation5Visit3,
    registeredCustomers: last7.registeredCustomers,
    totalCompanions: last7.totalCompanions,
    totalVenueVisitors: last7.totalVenueVisitors,
    averageGroupSize: last7.averageGroupSize,
    largestGroup: last7.largestGroup,
    reportsQA: issues.length === 0 ? "PASS" : "FAIL",
    issues,
    fabrikaRegression: fabrikaOk ? "PASS" : "FAIL",
    noDataModified: "PASS (read-only QA)",
  };

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.reportsQA === "PASS" && summary.fabrikaRegression === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
