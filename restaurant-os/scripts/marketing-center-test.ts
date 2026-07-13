/**
 * AI Marketing Center Phase 1 architecture test.
 * Usage: npx tsx scripts/marketing-center-test.ts [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3005";
const ADMIN = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const PASS = process.env.QA_ADMIN_PASSWORD || "admin123456";

const results: { name: string; ok: boolean; detail?: string }[] = [];
const pass = (n: string, d?: string) => { results.push({ name: n, ok: true, detail: d }); console.log(`✓ ${n}${d ? ` — ${d}` : ""}`); };
const fail = (n: string, d?: string) => { results.push({ name: n, ok: false, detail: d }); console.error(`✗ ${n}${d ? ` — ${d}` : ""}`); };

async function json(r: Response) { return r.json().catch(() => ({})); }

async function login() {
  const csrf = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrf);
  const cookies = csrf.headers.getSetCookie?.() || [];
  const lr = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies.map((c) => c.split(";")[0]).join("; ") },
    body: new URLSearchParams({ csrfToken, email: ADMIN, password: PASS, callbackUrl: `${BASE}/dashboard`, json: "true" }),
    redirect: "manual",
  });
  return [...cookies, ...(lr.headers.getSetCookie?.() || [])].map((c) => c.split(";")[0]).join("; ");
}

async function main() {
  console.log(`=== AI Marketing Center Test ===\n${BASE}\n`);
  const cookie = await login();
  if (!cookie) { fail("Login"); process.exit(1); }
  pass("Login");

  const pages = [
    ["Home", "/dashboard/marketing-center"],
    ["Budget", "/dashboard/marketing-center/budget"],
    ["Recommendations", "/dashboard/marketing-center/recommendations"],
    ["Investment", "/dashboard/marketing-center/investment"],
    ["Performance", "/dashboard/marketing-center/performance"],
    ["Decisions", "/dashboard/marketing-center/decisions"],
    ["Goals", "/dashboard/marketing-center/goals"],
    ["Timeline", "/dashboard/marketing-center/timeline"],
    ["Integrations", "/dashboard/marketing-center/integrations"],
    ["Chat", "/dashboard/marketing-center/chat"],
    ["Simulation", "/dashboard/marketing-center/simulation"],
  ];

  for (const [name, path] of pages) {
    const r = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
    if ([200, 307].includes(r.status)) pass(`Page: ${name}`, `HTTP ${r.status}`);
    else fail(`Page: ${name}`, `HTTP ${r.status}`);
  }

  const home = await json(await fetch(`${BASE}/api/marketing-center/home`, { headers: { Cookie: cookie } }));
  if (home.aiScore != null) pass("API: home", `score ${home.aiScore}`);
  else fail("API: home", home.error);

  const budget = await json(await fetch(`${BASE}/api/marketing-center/budget`, { headers: { Cookie: cookie } }));
  if (budget.daily != null) pass("API: budget", `${budget.daily} SAR`);
  else fail("API: budget");

  const sim = await json(await fetch(`${BASE}/api/marketing-center/simulate`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ budget: 500 }),
  }));
  if (sim.simulation?.expectedRoi) pass("API: simulation", `ROI ${sim.simulation.expectedRoi}%`);
  else fail("API: simulation");

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n=== ${ok}/${results.length} PASS ===`);
  process.exit(ok === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
