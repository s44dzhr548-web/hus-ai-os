#!/usr/bin/env node
const BASE = process.env.BASE_URL || "http://localhost:3005";
const ROUTES = [
  "/dashboard/marketing",
  "/dashboard/marketing/ai-brain",
  "/dashboard/marketing/ai-brain/providers",
  "/dashboard/marketing/budget",
  "/dashboard/marketing/allocation",
  "/dashboard/marketing/campaigns",
  "/dashboard/marketing/creative",
  "/dashboard/marketing/creative/copy/providers",
  "/dashboard/marketing/analytics",
  "/dashboard/marketing/assistant",
  "/dashboard/marketing/automations",
  "/dashboard/marketing/journey",
  "/dashboard/marketing/connections",
];

async function main() {
  let pass = 0;
  for (const route of ROUTES) {
    try {
      const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
      const ok = [200, 307, 308].includes(res.status);
      console.log(`${ok ? "PASS" : "FAIL"} ${route} → ${res.status}`);
      if (ok) pass++;
    } catch (e) {
      console.log(`FAIL ${route}`);
    }
  }
  console.log(`\n${pass}/${ROUTES.length}`);
  process.exit(pass === ROUTES.length ? 0 : 1);
}
main();
