#!/usr/bin/env node
/**
 * HUSAI-OS 2.0 — Autonomous Recovery
 * Detects errors in ai-memory, attempts fixes, retries, logs results.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const memoryPath = path.join(root, "projects", "ai-memory.json");
const MAX_RETRIES = 3;

function loadMemory() {
  return JSON.parse(fs.readFileSync(memoryPath, "utf8"));
}

function saveMemory(memory) {
  memory.updatedAt = new Date().toISOString();
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2) + "\n");
  try {
    execSync("node scripts/sync-ai-memory.js", { cwd: root, stdio: "pipe" });
  } catch {}
}

function logActivity(memory, agent, action, project = null) {
  memory.agentActivity.unshift({
    id: `act-${Date.now()}`,
    agent,
    action,
    project,
    timestamp: new Date().toISOString(),
  });
}

function attemptFix(error) {
  const fixes = [];

  if (error.type === "build" || error.message?.includes("build")) {
    const app = error.message.split(" ")[0];
    const dir = path.join(root, app);
    if (fs.existsSync(dir)) {
      try {
        execSync("npm install", { cwd: dir, stdio: "pipe", timeout: 120000 });
        execSync("npm run build", { cwd: dir, stdio: "pipe", timeout: 180000, env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder",
        }});
        fixes.push({ ok: true, action: `Rebuilt ${app}` });
      } catch (e) {
        fixes.push({ ok: false, action: `Build retry failed: ${app}` });
      }
    }
  }

  if (error.type === "production-health" || error.type === "production-page") {
    fixes.push({ ok: false, action: "Deploy retry queued for Deployment Agent", needsDeploy: true });
  }

  if (error.type === "github" || error.type === "supabase") {
    fixes.push({ ok: false, action: "OAuth gate required", gate: "oauth" });
  }

  return fixes;
}

async function main() {
  console.log("\n=== HUSAI-OS Autonomous Recovery ===\n");

  if (!fs.existsSync(memoryPath)) {
    console.log("No ai-memory.json — run health-check first");
    process.exit(0);
  }

  const memory = loadMemory();
  const openErrors = (memory.errors || []).filter((e) => e.status !== "resolved");

  if (openErrors.length === 0) {
    console.log("No open errors. System healthy.");
    process.exit(0);
  }

  for (const error of openErrors) {
    console.log(`Recovering: ${error.type} — ${error.message}`);
    let resolved = false;

    for (let attempt = 1; attempt <= MAX_RETRIES && !resolved; attempt++) {
      console.log(`  Attempt ${attempt}/${MAX_RETRIES}`);
      const fixes = attemptFix(error);

      for (const fix of fixes) {
        memory.fixes = memory.fixes || [];
        memory.fixes.unshift({
          id: `fix-${Date.now()}`,
          errorId: error.id,
          action: fix.action,
          success: fix.ok,
          timestamp: new Date().toISOString(),
        });

        if (fix.gate === "oauth") {
          memory.pendingApprovals = memory.pendingApprovals || [];
          const existing = memory.pendingApprovals.find((p) => p.gate === "oauth" && p.status === "open");
          if (!existing) {
            memory.pendingApprovals.push({
              id: `apr-${Date.now()}`,
              gate: "oauth",
              reason: error.message,
              provider: error.type,
              status: "open",
              createdAt: new Date().toISOString(),
            });
          }
          logActivity(memory, "orchestrator", `Escalated to Human Approval Gateway: OAuth`, null);
          break;
        }

        if (fix.ok) {
          error.status = "resolved";
          error.resolvedAt = new Date().toISOString();
          resolved = true;
          logActivity(memory, "orchestrator", `Auto-fixed: ${fix.action}`, null);
        }
      }
    }

    if (!resolved && error.status !== "resolved") {
      error.retries = (error.retries || 0) + MAX_RETRIES;
      logActivity(memory, "orchestrator", `Recovery exhausted for ${error.id}`, null);
    }
  }

  saveMemory(memory);
  console.log("\nRecovery cycle complete.\n");
}

main();
