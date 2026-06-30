#!/usr/bin/env node
/**
 * Validates local env files and prints browser connect links.
 * No gh CLI required — uses Git Credential Manager + browser OAuth for push.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const apps = [
  { name: "restaurant-os", required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] },
  { name: "trading-ai", required: [] },
];

console.log("\n=== HUSAI-OS Platform Status ===\n");

for (const app of apps) {
  const envPath = path.join(root, app.name, ".env.local");
  const exists = fs.existsSync(envPath);
  console.log(`${app.name}:`);
  console.log(`  .env.local: ${exists ? "found" : "missing"}`);
  if (exists && app.required.length) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const key of app.required) {
      const ok = new RegExp(`${key}=.+`).test(content) && !content.includes(`${key}=\n`);
      console.log(`  ${key}: ${ok ? "set" : "empty"}`);
    }
  }
  console.log("");
}

console.log("Browser connect (no gh CLI):");
console.log("  GitHub login:  https://github.com/login");
console.log("  New repo:      https://github.com/new?name=hus-ai-os");
console.log("  Vercel login:  https://vercel.com/login");
console.log("  Supabase:      https://supabase.com/dashboard");
console.log("\nFull guide: docs/platform-connect.md\n");
