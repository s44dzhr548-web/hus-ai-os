export type ProjectStatus = "live" | "development" | "planned";

export interface RegistryProject {
  slug: string;
  name: string;
  description: string;
  priority: string;
  stack: string[];
  localPath: string;
  githubPath: string;
  vercelProject: string;
  productionUrl: string;
  healthPath: string;
  devPort: number;
  supabase: boolean;
  status: ProjectStatus;
}

export type HusaiProject = RegistryProject;

export interface HusaiRegistry {
  version: number;
  updatedAt: string;
  github: {
    remote: string;
    branch: string;
  };
  supabase: {
    project: string;
    ref: string;
    region: string;
    status: string;
  };
  dashboard?: {
    localPath: string;
    vercelProject: string;
    productionUrl: string;
    devPort: number;
  };
  projects: RegistryProject[];
}

export interface ProjectHealthCheck {
  ok: boolean;
  latencyMs: number;
  error?: string;
  message?: string;
}

export interface ProjectWithHealth extends RegistryProject {
  health: ProjectHealthCheck;
  build: { exists: boolean };
}

export interface PlatformStatus {
  checkedAt: string;
  github: {
    remote: string;
    branch: string;
    synced: boolean;
  };
  supabase: {
    project: string;
    ref: string;
    region: string;
    status: string;
  };
  summary: {
    total: number;
    live: number;
    healthy: number;
    readinessPercent: number;
  };
  projects: ProjectWithHealth[];
}

export interface DeploymentRecord {
  id: string;
  project: string;
  environment: string;
  status: "success" | "failed" | "pending";
  url: string;
  deployedAt: string;
}

export interface CreateProjectInput {
  slug: string;
  name: string;
  description: string;
  priority: "P1" | "P2" | "P3";
  devPort: number;
  supabase: boolean;
}

export type StatusTone = "success" | "warning" | "error" | "neutral";
