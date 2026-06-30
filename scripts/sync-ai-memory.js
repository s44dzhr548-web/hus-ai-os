#!/usr/bin/env node
/** Sync projects/ai-memory.json into husai-dashboard bundle for Vercel */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "projects", "ai-memory.json");
const dest = path.join(root, "husai-dashboard", "src", "data", "ai-memory.json");

if (!fs.existsSync(src)) {
  if (fs.existsSync(dest)) process.exit(0);
  console.error("Missing projects/ai-memory.json");
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("Synced ai-memory → husai-dashboard/src/data/ai-memory.json");
