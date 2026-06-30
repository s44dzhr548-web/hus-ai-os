#!/usr/bin/env node
/**
 * HUSAI-OS 2.0 — Comprehensive platform health checks.
 * Run by Orchestrator / CI. Updates ai-memory.json with results.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const memoryPath = path.join(root, "projects", "ai-memory.json");
const registryPath = path.join(root, "projects", "registry.json");

const checks = { passed: 0, failed: 0, results: [] };

function pass(name, detail) {
  checks.passed++;
  checks.results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}: ${detail}`);
}

function fail(name, detail) {
  checks.failed++;
  checks.results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}: ${detail}`);
}

async function fetchOk(url, timeout = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return { ok: res.ok, status: res.status, body: res.ok ? await res.text() : "" };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: 0, body: e.message };
  }
}

async function main() {
  console.log("\n=== HUSAI-OS 2.0 Health Check ===\n");

  // Meta structure
  for (const f of ["README.md", "HUSAI_AGENT.md", "projects/ai-memory.json", "projects/registry.json"]) {
    fs.existsSync(path.join(root, f)) ? pass("structure", f) : fail("structure", `missing ${f}`);
  }

  // Agent definitions
  const requiredAgents = [
    "ceo-agent.md", "orchestrator-agent.md", "cto-agent.md",
    "product-manager-agent.md", "architect-agent.md", "frontend-agent.md",
    "backend-agent.md", "database-agent.md", "api-integration-agent.md",
    "qa-agent.md", "devops-agent.md", "security-agent.md",
    "marketing-agent.md", "finance-agent.md", "customer-support-agent.md",
  ];
  for (const a of requiredAgents) {
    const p = path.join(root, "agents", a);
    fs.existsSync(p) ? pass("agent", a) : fail("agent", `missing ${a}`);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

  // Production URL checks
  for (const project of registry.projects) {
    const healthUrl = `${project.productionUrl}${project.healthPath}`;
    const page = await fetchOk(project.productionUrl);
    const health = await fetchOk(healthUrl);

    if (page.ok) pass("production-page", project.slug);
    else fail("production-page", `${project.slug} HTTP ${page.status}`);

    if (health.ok) pass("production-health", project.slug);
    else fail("production-health", `${project.slug} HTTP ${health.status}`);
  }

  // GitHub API
  try {
    const repo = registry.github.remote.replace("https://github.com/", "https://api.github.com/repos/");
    const res = await fetch(repo, { headers: { Accept: "application/vnd.github+json" } });
    if (res.ok || res.status === 403) pass("github", registry.github.remote);
    else fail("github", `HTTP ${res.status}`);
  } catch (e) {
    fail("github", e.message);
  }

  // Supabase
  try {
    const ref = registry.supabase.ref;
    const res = await fetch(`https://${ref}.supabase.co/rest/v1/`);
    if (res.ok || res.status === 401) pass("supabase", registry.supabase.project);
    else fail("supabase", `HTTP ${res.status}`);
  } catch (e) {
    fail("supabase", e.message);
  }

  // Local builds (optional — skip if no node_modules)
  const apps = ["husai-dashboard", "restaurant-os", "trading-ai", "dropshipping-research"];
  for (const app of apps) {
    const dir = path.join(root, app);
    if (!fs.existsSync(path.join(dir, "node_modules"))) {
      pass("build-skip", `${app} (no node_modules)`);
      continue;
    }
    try {
      execSync("npm run build", { cwd: dir, stdio: "pipe", timeout: 180000, env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
      }});
      pass("build", app);
    } catch {
      fail("build", app);
    }
  }

  // Update ai-memory
  if (fs.existsSync(memoryPath)) {
    const memory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));
    memory.updatedAt = new Date().toISOString();
    memory.agentActivity.unshift({
      id: `act-${Date.now()}`,
      agent: "orchestrator",
      action: `Health check: ${checks.passed} passed, ${checks.failed} failed`,
      project: null,
      timestamp: new Date().toISOString(),
    });
    if (checks.failed > 0) {
      memory.errors = memory.errors || [];
      for (const r of checks.results.filter((x) => !x.ok)) {
        memory.errors.push({
          id: `err-${Date.now()}-${r.name}`,
          type: r.name,
          message: r.detail,
          status: "detected",
          detectedAt: new Date().toISOString(),
        });
      }
    }
    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2) + "\n");
    try {
      execSync("node scripts/sync-ai-memory.js", { cwd: root, stdio: "pipe" });
    } catch {}
  }

  console.log(`\n=== Summary: ${checks.passed} passed, ${checks.failed} failed ===\n`);
  process.exit(checks.failed > 0 ? 1 : 0);
}

main();
