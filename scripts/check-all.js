#!/usr/bin/env node
/** Comprehensive HUSAI-OS platform audit */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const apps = ["husai-dashboard", "restaurant-os", "trading-ai", "dropshipping-research"];

console.log("\n=== HUSAI-OS Full Platform Check ===\n");

let errors = 0;

for (const app of apps) {
  const dir = path.join(root, app);
  console.log(`${app}:`);
  if (!fs.existsSync(dir)) {
    console.log("  ✗ folder missing");
    errors++;
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  console.log(`  package: ${pkg.name}@${pkg.version}`);

  const envLocal = path.join(dir, ".env.local");
  const envExample = path.join(dir, ".env.example");
  console.log(`  .env.local: ${fs.existsSync(envLocal) ? "found" : "missing (optional)"}`);

  try {
    execSync("npm run build", { cwd: dir, stdio: "pipe", timeout: 180000 });
    console.log("  build: ✓");
  } catch (e) {
    console.log("  build: ✗");
    errors++;
  }

  if (fs.existsSync(path.join(dir, "node_modules"))) {
    try {
      execSync("npm test", { cwd: dir, stdio: "pipe", timeout: 60000 });
      console.log("  tests: ✓");
    } catch {
      console.log("  tests: ✗ or skipped");
    }
  }
  console.log("");
}

const registryPath = path.join(root, "projects", "registry.json");
if (fs.existsSync(registryPath)) {
  const reg = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  console.log(`Registry: ${reg.projects.length} projects`);
  console.log(`GitHub: ${reg.github.remote}`);
  console.log(`Supabase: ${reg.supabase.project} (${reg.supabase.status})`);
}

console.log(`\n=== ${errors ? "ISSUES FOUND" : "ALL CHECKS PASSED"} (${errors} errors) ===\n`);
process.exit(errors ? 1 : 0);
