#!/usr/bin/env node
import { spawnSync } from "child_process";
import { assertDbEnv } from "./lib/load-migrate-env.mjs";

assertDbEnv();

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
