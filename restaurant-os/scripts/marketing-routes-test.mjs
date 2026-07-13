#!/usr/bin/env node
/** Local marketing route smoke test — staging/local only */

const BASE = process.env.BASE_URL || "http://localhost:3005";

const ROUTES = [
  "/dashboard/marketing",
  "/dashboard/marketing/budget",
  "/dashboard/marketing/allocation",
  "/dashboard/marketing/simulation",
  "/dashboard/marketing/decisions",
  "/dashboard/marketing/opportunities",
  "/dashboard/marketing/goals",
  "/dashboard/marketing/campaigns",
  "/dashboard/marketing/creative",
  "/dashboard/marketing/assistant",
  "/dashboard/marketing/platforms",
  "/dashboard/marketing/audiences",
  "/dashboard/marketing/automations",
  "/dashboard/marketing/reports",
  "/dashboard/marketing/integrations",
  "/dashboard/marketing/settings",
  "/login",
];

async function main() {
  let pass = 0;
  let fail = 0;
  for (const route of ROUTES) {
    try {
      const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
      const ok = res.status === 200 || res.status === 307 || res.status === 308;
      console.log(`${ok ? "PASS" : "FAIL"} ${route} → ${res.status}`);
      if (ok) pass++;
      else fail++;
    } catch (e) {
      console.log(`FAIL ${route} → ${e instanceof Error ? e.message : String(e)}`);
      fail++;
    }
  }
  console.log(`\n${pass}/${ROUTES.length} passed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
