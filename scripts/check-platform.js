#!/usr/bin/env node
/**
 * Agent diagnostic — validates env files and platform status.
 * Not a user task; Orchestrator / Setup Agent runs this.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const registryPath = path.join(root, "projects", "registry.json");

const apps = [
  { name: "restaurant-os", required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] },
  { name: "trading-ai", required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] },
  { name: "dropshipping-research", required: [] },
  { name: "husai-dashboard", required: [] },
];

console.log("\n=== HUSAI-OS Platform Status (Agent Diagnostic) ===\n");

if (fs.existsSync(registryPath)) {
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  console.log(`Registry: ${registry.projects.length} projects`);
  console.log(`GitHub:   ${registry.github.remote}`);
  console.log(`Supabase: ${registry.supabase.project}\n`);
}

for (const app of apps) {
  const envPath = path.join(root, app.name, ".env.local");
  const exists = fs.existsSync(envPath);
  console.log(`${app.name}: .env.local ${exists ? "ok" : "missing"}`);
}

console.log("\nAgents: CEO → Orchestrator → Project Factory → Deploy");
console.log("User: payment · OTP · OAuth · KYC · legal only\n");
