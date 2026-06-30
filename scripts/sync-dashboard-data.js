#!/usr/bin/env node
/** Sync registry + ai-memory into husai-dashboard bundle */
const { execSync } = require("child_process");
const path = require("path");
const root = path.join(__dirname, "..");

try { execSync("node scripts/sync-registry.js", { cwd: root, stdio: "inherit" }); } catch {}
try { execSync("node scripts/sync-ai-memory.js", { cwd: root, stdio: "inherit" }); } catch {}
