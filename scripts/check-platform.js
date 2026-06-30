#!/usr/bin/env node
/**
 * Validates local env files and prints platform status summary.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const registryPath = path.join(root, "projects", "registry.json");

const apps = [
  {
    name: "restaurant-os",
    required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  },
  {
    name: "trading-ai",
    required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  },
  {
    name: "dropshipping-research",
    required: [],
  },
  {
    name: "husai-dashboard",
    required: [],
  },
];

console.log("\n=== HUSAI-OS Platform Status ===\n");

if (fs.existsSync(registryPath)) {
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  console.log(`Registry: ${registry.projects.length} projects · updated ${registry.updatedAt}`);
  console.log(`GitHub:   ${registry.github.remote}`);
  console.log(`Supabase: ${registry.supabase.project} (${registry.supabase.ref})\n`);
}

for (const app of apps) {
  const envPath = path.join(root, app.name, ".env.local");
  const exists = fs.existsSync(envPath);
  console.log(`${app.name}:`);
  console.log(`  .env.local: ${exists ? "found" : "missing"}`);
  if (exists && app.required.length) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const key of app.required) {
      const ok =
        new RegExp(`${key}=.+`).test(content) &&
        !content.includes(`${key}=\n`);
      console.log(`  ${key}: ${ok ? "set" : "empty"}`);
    }
  }
  console.log("");
}

console.log("Commands:");
console.log("  node scripts/create-project.js --slug my-app --name \"My App\"");
console.log("  cd husai-dashboard && npm run dev   # unified dashboard on :3003");
console.log("\nDocs: docs/platform-connect.md · docs/memory.md\n");
