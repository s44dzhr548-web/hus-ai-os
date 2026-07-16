#!/usr/bin/env node
/**
 * Read-only production QA for customer reports date filter consistency.
 */
const BASE = process.argv[2] || process.env.QA_BASE_URL || "https://restaurant-os-nine.vercel.app";
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

function checkConsistency(period, data) {
  const issues = [];
  if (!data.labels?.visitors || !data.labels?.totalVisits) {
    issues.push("missing dynamic labels");
  }
  if (data.from == null && period !== "") {
    issues.push("missing from timestamp");
  }
  if (data.to == null && period !== "") {
    issues.push("missing to timestamp");
  }
  if (typeof data.uniqueVisitors !== "number" || typeof data.totalVisits !== "number") {
    issues.push("missing unified metrics");
  }
  if (data.totalVisits < data.uniqueVisitors) {
    issues.push("totalVisits < uniqueVisitors");
  }
  if (data.repeatCustomers > data.uniqueVisitors) {
    issues.push("repeatCustomers > uniqueVisitors");
  }
  const topSum = (data.mostFrequentCustomers || []).reduce((s, c) => s + c.visitCount, 0);
  if (topSum > data.totalVisits) {
    issues.push("top visitors sum exceeds totalVisits");
  }
  if (period === "yesterday" && data.labels?.visitors?.includes("اليوم")) {
    issues.push("yesterday filter shows today label");
  }
  if (period === "last7" && data.labels?.visitors?.includes("الشهر")) {
    issues.push("7-day filter shows month label");
  }
  return issues;
}

async function fetchReports(cookie, period, extra = "") {
  const url = `${BASE}/api/customers?view=reports&period=${period}${extra}`;
  const res = await fetch(url, { headers: { Cookie: cookie } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${period}`);
  return res.json();
}

async function main() {
  console.log(`\n=== Customer Reports Date Filter QA ===\n${BASE}\n`);
  const cookie = await login();
  const results = {};

  for (const period of PERIODS) {
    const data = await fetchReports(cookie, period);
    const issues = checkConsistency(period, data);
    results[period] = {
      ok: issues.length === 0,
      issues,
      uniqueVisitors: data.uniqueVisitors,
      totalVisits: data.totalVisits,
      repeatCustomers: data.repeatCustomers,
      noShows: data.noShows,
      vipVisitors: data.vipVisitors,
      label: data.labels?.visitors,
      from: data.from,
      to: data.to,
    };
    console.log(
      `${issues.length === 0 ? "PASS" : "FAIL"} | ${period} | visits=${data.totalVisits} unique=${data.uniqueVisitors} label=${data.labels?.visitors}${issues.length ? ` | ${issues.join("; ")}` : ""}`
    );
  }

  const custom = await fetchReports(cookie, "custom", "&from=2026-07-01&to=2026-07-17");
  const customIssues = checkConsistency("custom", custom);
  if (!custom.labels?.visitors?.includes("الفترة")) customIssues.push("custom label wrong");
  results.custom = { ok: customIssues.length === 0, issues: customIssues };
  console.log(
    `${customIssues.length === 0 ? "PASS" : "FAIL"} | custom | visits=${custom.totalVisits} label=${custom.labels?.visitors}${customIssues.length ? ` | ${customIssues.join("; ")}` : ""}`
  );

  const yesterday = results.yesterday;
  const last7 = results.last7;
  if (yesterday?.totalVisits === last7?.totalVisits && yesterday?.totalVisits > 0) {
    console.log("WARN | yesterday and last7 have identical totals — verify manually if expected");
  }

  const fail = Object.values(results).filter((r) => !r.ok).length;
  console.log(`\n--- Customer Reports QA: ${fail === 0 ? "PASS" : "FAIL"} (${Object.keys(results).length - fail}/${Object.keys(results).length})`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
