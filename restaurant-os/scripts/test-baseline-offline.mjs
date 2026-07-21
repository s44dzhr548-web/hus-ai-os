#!/usr/bin/env node
/** Offline sanity check for baseline migration names (no DB required). */
import { listMigrationNames, BASELINE_LAST_APPLIED, BASELINE_PENDING } from "./lib/load-migrate-env.mjs";

const migrations = listMigrationNames();
const lastAppliedIdx = migrations.indexOf(BASELINE_LAST_APPLIED);
const pendingIdx = migrations.indexOf(BASELINE_PENDING);

const checks = [
  ["migration count", migrations.length >= 40, migrations.length],
  ["baseline last applied exists", lastAppliedIdx >= 0, BASELINE_LAST_APPLIED],
  ["pending migration exists", pendingIdx >= 0, BASELINE_PENDING],
  ["pending is after baseline", pendingIdx === lastAppliedIdx + 1, `${lastAppliedIdx} -> ${pendingIdx}`],
];

let failed = 0;
for (const [label, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${detail}`);
  if (!ok) failed++;
}

process.exit(failed ? 1 : 0);
