#!/usr/bin/env node
/**
 * Project Factory — autonomous new-project pipeline.
 * Orchestrator invokes this; user never runs commands manually.
 *
 * Usage:
 *   node scripts/project-factory.js "Project Name" "Description"
 *   node scripts/project-factory.js --slug my-app --name "My App" --supabase
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const args = process.argv.slice(2).join(" ");

console.log("\n=== HUSAI-OS Project Factory ===\n");

// 1. Scaffold + registry + spec
execSync(`node scripts/create-project.js ${args}`, { cwd: root, stdio: "inherit" });

// 2. Extract slug from args
const slugMatch = args.match(/--slug\s+(\S+)/) || args.match(/"([^"]+)"/);
const slug = slugMatch
  ? (args.match(/--slug\s+(\S+)/)?.[1] ||
      slugMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
  : null;

if (slug) {
  const projectDir = path.join(root, slug);
  try {
    console.log(`\n[Project Factory] Installing dependencies in ${slug}…`);
    execSync("npm install", { cwd: projectDir, stdio: "inherit" });
  } catch (e) {
    console.warn("[Project Factory] npm install failed — Orchestrator will retry");
  }
  try {
    console.log(`[Project Factory] Running build check…`);
    execSync("npm run build", { cwd: projectDir, stdio: "inherit" });
    console.log(`[Project Factory] Build passed for ${slug}`);
  } catch (e) {
    console.warn("[Project Factory] Build failed — Orchestrator will diagnose and fix");
  }
}

// 3. Sync memory + dashboard bundle
try {
  execSync("node scripts/sync-dashboard-data.js", { cwd: root, stdio: "inherit" });
} catch {}

console.log("\n[Project Factory] Pipeline stage complete.");
console.log("[Orchestrator] Next automated steps:");
console.log("  → Setup Agent: GitHub repo + Vercel project (OAuth if required)");
console.log("  → Setup Agent: Supabase connect (OAuth if required)");
console.log("  → DevOps Agent: deploy --project " + (slug || "{slug}"));
console.log("  → QA Agent: production URL + /api/health verification");
console.log("  → CEO Agent: return production URL to user\n");
