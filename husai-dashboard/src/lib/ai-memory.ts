import fs from "fs";
import path from "path";
import type { AiMemory } from "./types";

export function getMonorepoRoot(): string {
  return path.join(process.cwd(), "..");
}

export function getAiMemoryPath(): string {
  const bundled = path.join(process.cwd(), "src", "data", "ai-memory.json");
  const monorepo = path.join(getMonorepoRoot(), "projects", "ai-memory.json");
  if (fs.existsSync(bundled)) return bundled;
  return monorepo;
}

export function loadAiMemory(): AiMemory {
  const p = getAiMemoryPath();
  if (!fs.existsSync(p)) {
    return {
      version: 2,
      updatedAt: new Date().toISOString(),
      platform: { name: "HUSAI-OS", release: "2.0.0", principle: "zero_manual_work" },
      platforms: {
        github: { remote: "", branch: "main", status: "unknown" },
        vercel: { team: "", status: "unknown", projects: 0 },
        supabase: { project: "", ref: "", region: "", status: "unknown" },
      },
      credentials: {},
      pendingApprovals: [],
      currentTasks: [],
      agentActivity: [],
      errors: [],
      fixes: [],
      costs: { monthlyUsd: 0, breakdown: [], updatedAt: new Date().toISOString() },
      deployments: [],
      projects: [],
    };
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as AiMemory;
}
