import type {
  DeploymentRecord,
  HusaiRegistry,
  PlatformStatus,
  ProjectHealthCheck,
  ProjectWithHealth,
} from "./types";
import { getRegistry, projectBuildExists } from "./registry";

async function checkHealth(
  project: HusaiRegistry["projects"][number]
): Promise<ProjectHealthCheck> {
  const url = `${project.productionUrl}${project.healthPath}`;
  const start = Date.now();

  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    }

    let message = "Healthy";
    try {
      const body = (await res.json()) as { status?: string; app?: string };
      if (body.app && body.status) message = `${body.app} · ${body.status}`;
      else if (body.status) message = body.status;
    } catch {
      message = "Healthy";
    }

    return { ok: true, latencyMs, message };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unreachable",
    };
  }
}

async function checkGithub(registry: HusaiRegistry) {
  try {
    const repoUrl = registry.github.remote.replace(
      "https://github.com/",
      "https://api.github.com/repos/"
    );
    const res = await fetch(repoUrl, {
      next: { revalidate: 120 },
      headers: { Accept: "application/vnd.github+json" },
    });

    if (res.ok) {
      const data = (await res.json()) as { default_branch?: string };
      return {
        remote: registry.github.remote,
        branch: data.default_branch ?? registry.github.branch,
        synced: data.default_branch === registry.github.branch,
      };
    }

    if (res.status === 403 || res.status === 404) {
      return {
        remote: registry.github.remote,
        branch: registry.github.branch,
        synced: res.status !== 404,
      };
    }

    return {
      remote: registry.github.remote,
      branch: registry.github.branch,
      synced: false,
    };
  } catch {
    return {
      remote: registry.github.remote,
      branch: registry.github.branch,
      synced: false,
    };
  }
}

async function checkSupabase(registry: HusaiRegistry) {
  try {
    const url = `https://${registry.supabase.ref}.supabase.co/rest/v1/`;
    const res = await fetch(url, {
      next: { revalidate: 120 },
      headers: { Accept: "application/json" },
    });

    const online = res.ok || res.status === 401 || res.status === 400;
    return {
      project: registry.supabase.project,
      ref: registry.supabase.ref,
      region: registry.supabase.region,
      status: online ? registry.supabase.status : "unreachable",
    };
  } catch {
    return {
      project: registry.supabase.project,
      ref: registry.supabase.ref,
      region: registry.supabase.region,
      status: "unreachable",
    };
  }
}

export async function getPlatformStatus(): Promise<PlatformStatus> {
  const registry = getRegistry();
  const [github, supabase, ...healthResults] = await Promise.all([
    checkGithub(registry),
    checkSupabase(registry),
    ...registry.projects.map(async (project) => {
      const health = await checkHealth(project);
      const enriched: ProjectWithHealth = {
        ...project,
        health,
        build: { exists: projectBuildExists(project.localPath) },
      };
      return enriched;
    }),
  ]);

  const live = healthResults.filter((p) => p.status === "live").length;
  const healthy = healthResults.filter((p) => p.health.ok).length;
  const total = healthResults.length;
  const readinessPercent =
    total === 0 ? 0 : Math.round((healthy / total) * 100);

  return {
    checkedAt: new Date().toISOString(),
    github,
    supabase,
    summary: { total, live, healthy, readinessPercent },
    projects: healthResults,
  };
}

export function getDeploymentHistory(): DeploymentRecord[] {
  const registry = getRegistry();
  return registry.projects.map((project) => ({
    id: project.slug,
    project: project.name,
    environment: "production",
    status: project.status === "live" ? ("success" as const) : ("pending" as const),
    url: project.productionUrl,
    deployedAt: registry.updatedAt,
  }));
}
