/**
 * Visit tracking + staff audit QA (production-safe read checks)
 * Usage: node scripts/visit-tracking-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, json, text };
}

async function main() {
  console.log(`\nVisit Tracking QA @ ${BASE}\n`);

  const pages = [
    ["/dashboard/customers?tab=visits", "Customer History visits tab"],
    ["/dashboard/staff/activity", "Staff Activity"],
    ["/dashboard/staff/login-history", "Login History"],
    ["/dashboard/staff/audit", "Audit Log"],
  ];

  for (const [path, label] of pages) {
    const { status } = await get(path);
    if (status === 200 || status === 307 || status === 302) pass(`Page ${label}`, `HTTP ${status}`);
    else fail(`Page ${label}`, `HTTP ${status}`);
  }

  const apiChecks = [
    ["/api/customers?view=visits", "Customers visits API"],
    ["/api/staff-activity?section=summary", "Staff activity API"],
    ["/api/staff-activity?section=login-history", "Login history API"],
    ["/api/staff-activity?section=audit", "Audit API"],
  ];

  for (const [path, label] of apiChecks) {
    const { status } = await get(path);
    if (status === 401 || status === 403) pass(`${label} auth gate`, `HTTP ${status}`);
    else if (status === 200) pass(`${label}`, "authenticated");
    else fail(`${label}`, `HTTP ${status}`);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n--- ${passed}/${results.length} checks passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
