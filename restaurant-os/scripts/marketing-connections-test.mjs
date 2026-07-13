#!/usr/bin/env node
const BASE = process.env.BASE_URL || "http://localhost:3005";
const ROUTES = [
  "/dashboard/marketing/connections",
  "/dashboard/marketing/ai-brain/providers",
  "/dashboard/marketing/creative/images/providers",
  "/dashboard/marketing/creative/videos/providers",
  "/dashboard/marketing/creative/audio/providers",
  "/dashboard/marketing/platforms/connect",
  "/dashboard/marketing/ai-brain/routing",
  "/dashboard/marketing/ai-costs",
  "/dashboard/marketing/connections/wizard",
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
      console.log(`FAIL ${route} → ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\n${pass}/${ROUTES.length} connection routes`);
  process.exit(pass === ROUTES.length ? 0 : 1);
}
main();
