#!/usr/bin/env node
/** Copy projects/registry.json into husai-dashboard for Vercel deployments */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "projects", "registry.json");
const dest = path.join(root, "husai-dashboard", "src", "data", "registry.json");

if (!fs.existsSync(src)) {
  if (fs.existsSync(dest)) {
    console.log("Using bundled registry (monorepo source not available)");
    process.exit(0);
  }
  console.error("Missing projects/registry.json and bundled registry");
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("Synced registry → husai-dashboard/src/data/registry.json");
