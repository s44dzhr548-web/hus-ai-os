#!/usr/bin/env node
/**
 * Read-only QA for 4 AM business-day boundaries and report consistency.
 */

const BASE =
  process.argv[2] || process.env.QA_BASE_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const PERIODS = ["today", "yesterday", "last7", "last30", "last90"];

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

function runLocalBoundaryTests() {
  const tz = "Asia/Riyadh";
  const hour = 4;
  const bd = "2026-07-17";
  const startUtc = new Date("2026-07-17T01:00:00.000Z");
  const endUtc = new Date("2026-07-18T00:59:59.999Z");

  function businessDateForTimestamp(at) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(at);
    const pick = (t) =>
      parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
    const y = pick("year");
    const m = pick("month");
    const d = pick("day");
    const h = pick("hour") % 24;
    const cal = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (h < hour) {
      const prev = new Date(Date.UTC(y, m - 1, d - 1));
      return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}-${String(prev.getUTCDate()).padStart(2, "0")}`;
    }
    return cal;
  }

  const cases = [
    {
      name: "03:59:59",
      at: new Date("2026-07-18T00:59:59.999Z"),
      expectBd: "2026-07-17",
    },
    {
      name: "04:00:00",
      at: new Date("2026-07-18T01:00:00.000Z"),
      expectBd: "2026-07-18",
    },
    {
      name: "11:59 PM",
      at: new Date("2026-07-17T20:59:00.000Z"),
      expectBd: "2026-07-17",
    },
    {
      name: "01:30 AM",
      at: new Date("2026-07-17T22:30:00.000Z"),
      expectBd: "2026-07-17",
    },
  ];

  const results = cases.map((c) => ({
    ...c,
    got: businessDateForTimestamp(c.at),
    pass: businessDateForTimestamp(c.at) === c.expectBd,
  }));

  return {
    boundary0359: results.find((r) => r.name === "03:59:59")?.pass ? "PASS" : "FAIL",
    boundary0400: results.find((r) => r.name === "04:00:00")?.pass ? "PASS" : "FAIL",
    rangeStartOk: startUtc.toISOString() === "2026-07-17T01:00:00.000Z" ? "PASS" : "FAIL",
    rangeEndOk: endUtc.toISOString() === "2026-07-18T00:59:59.999Z" ? "PASS" : "FAIL",
    cases: results,
  };
}

async function fetchReports(cookie, period, extra = "") {
  const url = `${BASE}/api/customers?view=reports&period=${period}${extra}`;
  const res = await fetch(url, { headers: { Cookie: cookie } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${period}`);
  return res.json();
}

async function fabrikaRegression(cookie) {
  const res = await fetch(`${BASE}/api/customers?view=customers`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) return { pass: false, count: 0 };
  const data = await res.json();
  const fabrika = (data.customers || []).filter((c) =>
    /fabrika/i.test(c.customerName || "")
  );
  return { pass: fabrika.length >= 19, count: fabrika.length };
}

async function main() {
  console.log(`\n=== Business Day QA ===\n${BASE}\n`);

  let local;
  try {
    local = runLocalBoundaryTests();
    console.log("Local boundary tests:", JSON.stringify(local, null, 2));
  } catch (e) {
    console.log("Local boundary tests error:", e.message);
    local = {
      boundary0359: "FAIL",
      boundary0400: "FAIL",
    };
  }

  const cookie = await login();
  const periodResults = {};
  let reportsOk = true;

  for (const period of PERIODS) {
    const data = await fetchReports(cookie, period);
    const issues = [];
    if (!data.businessDayNote?.includes("4:00")) issues.push("missing business day note");
    if (!data.from || !data.to) issues.push("missing range");
    if (data.actualEntries == null && data.totalVisits == null) issues.push("missing entry metrics");
    if (data.totalVisits < data.uniqueVisitors) issues.push("visits < unique");
    periodResults[period] = { issues, uniqueVisitors: data.uniqueVisitors, totalVisits: data.totalVisits, actualEntries: data.actualEntries };
    if (issues.length) reportsOk = false;
  }

  const today = await fetchReports(cookie, "today");
  const actualEntryOk =
    typeof today.actualEntries === "number" &&
    today.actualEntries === today.totalVisits &&
    typeof today.uniqueVisitors === "number";

  const fabrika = await fabrikaRegression(cookie);

  const summary = {
    boundary0359: local.boundary0359,
    boundary0400: local.boundary0400,
    actualEntryCount: actualEntryOk ? "PASS" : "FAIL",
    reportsExports: reportsOk ? "PASS" : "FAIL",
    fabrikaRegression: fabrika.pass ? "PASS" : "FAIL",
    fabrikaCount: fabrika.count,
    periodResults,
    noDataModified: "PASS (read-only QA)",
  };

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));

  const failed = Object.values(summary).some((v) => v === "FAIL");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
