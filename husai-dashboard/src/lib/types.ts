export type ProjectStatus = "live" | "development" | "planned";
export type GateType = "oauth" | "otp" | "payment" | "kyc" | "legal";
export type CredentialStatus = "connected" | "pending_oauth" | "pending_payment" | "pending_kyc" | "pending_legal" | "not_required" | "optional" | "error";

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
  github: { remote: string; branch: string };
  supabase: { project: string; ref: string; region: string; status: string };
  dashboard?: { localPath: string; vercelProject: string; productionUrl: string; devPort: number };
  projects: RegistryProject[];
}

export interface PendingApproval {
  id: string;
  gate: GateType;
  reason: string;
  provider?: string;
  project?: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}

export interface AgentActivity {
  id: string;
  agent: string;
  action: string;
  project: string | null;
  timestamp: string;
}

export interface CurrentTask {
  id: string;
  title: string;
  agent: string;
  status: "idle" | "running" | "blocked" | "done";
  priority: string;
  startedAt: string;
}

export interface MemoryError {
  id: string;
  type: string;
  message: string;
  status: "detected" | "recovering" | "resolved";
  detectedAt: string;
  resolvedAt?: string;
  retries?: number;
}

export interface MemoryFix {
  id: string;
  errorId: string;
  action: string;
  success: boolean;
  timestamp: string;
}

export interface DeploymentRecord {
  id: string;
  project: string;
  environment: string;
  url: string;
  status: "success" | "failed" | "pending";
  deployedAt: string;
}

export interface CostBreakdown {
  service: string;
  usd: number;
  tier: string;
}

export interface MemoryProject {
  slug: string;
  name: string;
  status: string;
  health: string;
  productionUrl: string;
  github: string;
  vercel: string;
  supabase: string;
  lastDeploy: string;
  monthlyCostUsd: number;
}

export interface AiMemory {
  version: number;
  updatedAt: string;
  platform: { name: string; release: string; principle: string };
  platforms: {
    github: { remote: string; branch: string; status: string; lastSync?: string };
    vercel: { team: string; status: string; projects: number };
    supabase: { project: string; ref: string; region: string; status: string };
  };
  credentials: Record<string, { status: string; required: boolean }>;
  pendingApprovals: PendingApproval[];
  currentTasks: CurrentTask[];
  agentActivity: AgentActivity[];
  errors: MemoryError[];
  fixes: MemoryFix[];
  costs: { monthlyUsd: number; breakdown: CostBreakdown[]; updatedAt: string };
  deployments: DeploymentRecord[];
  projects: MemoryProject[];
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
  github: { remote: string; branch: string; synced: boolean };
  supabase: { project: string; ref: string; region: string; status: string };
  summary: { total: number; live: number; healthy: number; readinessPercent: number };
  projects: ProjectWithHealth[];
}

export interface DashboardState {
  memory: AiMemory;
  platform: PlatformStatus;
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

export const GATE_LABELS: Record<GateType, string> = {
  oauth: "OAuth / Login",
  otp: "OTP / Verification",
  payment: "Payment",
  kyc: "KYC",
  legal: "Legal Confirmation",
};

export const AGENT_LABELS: Record<string, string> = {
  ceo: "CEO Agent",
  orchestrator: "Orchestrator",
  cto: "CTO Agent",
  "product-manager": "Product Manager",
  architect: "Architect",
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  api: "API Integration",
  qa: "QA",
  devops: "DevOps",
  security: "Security",
  deployment: "Deployment",
  marketing: "Marketing",
  finance: "Finance",
  support: "Customer Support",
  setup: "Setup",
};
