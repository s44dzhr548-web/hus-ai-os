#!/usr/bin/env node
const BASE = process.env.BASE_URL || "http://localhost:3005";
const ROUTES = [
  "/dashboard/marketing",
  "/dashboard/marketing/command-center",
  "/dashboard/marketing/goals",
  "/dashboard/marketing/budget",
  "/dashboard/marketing/allocation",
  "/dashboard/marketing/simulation",
  "/dashboard/marketing/opportunities",
  "/dashboard/marketing/decisions",
  "/dashboard/marketing/campaigns",
  "/dashboard/marketing/campaigns/new",
  "/dashboard/marketing/creative",
  "/dashboard/marketing/creative/images",
  "/dashboard/marketing/creative/videos",
  "/dashboard/marketing/creative/audio",
  "/dashboard/marketing/copywriting",
  "/dashboard/marketing/audiences",
  "/dashboard/marketing/customer-journey",
  "/dashboard/marketing/analytics",
  "/dashboard/marketing/automations",
  "/dashboard/marketing/reports",
  "/dashboard/marketing/assistant",
  "/dashboard/marketing/ai-brain",
  "/dashboard/marketing/ai-brain/providers",
  "/dashboard/marketing/ai-brain/routing",
  "/dashboard/marketing/platforms",
  "/dashboard/marketing/connections",
  "/dashboard/marketing/costs",
  "/dashboard/marketing/settings",
  "/dashboard/marketing/audit-log",
];

async function main() {
  let pass = 0;
  for (const route of ROUTES) {
    try {
      const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
      const ok = [200, 307, 308].includes(res.status);
      console.log(`${ok ? "PASS" : "FAIL"} ${route} → ${res.status}`);
      if (ok) pass++;
    } catch {
      console.log(`FAIL ${route}`);
    }
  }
  console.log(`\n${pass}/${ROUTES.length} marketing routes`);
  process.exit(pass === ROUTES.length ? 0 : 1);
}
main();
