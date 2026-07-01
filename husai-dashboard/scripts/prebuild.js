#!/usr/bin/env node
/** Sync monorepo data when available; skip on Vercel standalone deploy */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const syncScript = path.join(__dirname, "../../scripts/sync-dashboard-data.js");

if (fs.existsSync(syncScript)) {
  execSync(`node "${syncScript}"`, { stdio: "inherit" });
} else {
  console.log("Using bundled registry/ai-memory (standalone deploy)");
}
