export type EnterpriseLogType =
  | "api_call"
  | "provider_switch"
  | "cache_hit"
  | "cache_miss"
  | "error"
  | "latency"
  | "ai_decision"
  | "validation_warning";

export interface EnterpriseLogEntry {
  id: string;
  type: EnterpriseLogType;
  providerId?: string;
  symbol?: string;
  message: string;
  latencyMs?: number;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

const MAX_LOGS = 2000;
const logs: EnterpriseLogEntry[] = [];

export function logEnterprise(entry: Omit<EnterpriseLogEntry, "id" | "createdAt">) {
  const row: EnterpriseLogEntry = {
    ...entry,
    id: `elog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  logs.unshift(row);
  if (logs.length > MAX_LOGS) logs.pop();
  return row;
}

export function getEnterpriseLogs(limit = 100, type?: EnterpriseLogType) {
  let rows = logs;
  if (type) rows = rows.filter((l) => l.type === type);
  return rows.slice(0, limit);
}

export function getEnterpriseLogStats() {
  const total = logs.length;
  const errors = logs.filter((l) => l.type === "error").length;
  const cacheHits = logs.filter((l) => l.type === "cache_hit").length;
  const cacheMisses = logs.filter((l) => l.type === "cache_miss").length;
  const switches = logs.filter((l) => l.type === "provider_switch").length;
  const avgLatency =
    logs.filter((l) => l.latencyMs != null).reduce((s, l) => s + (l.latencyMs ?? 0), 0) /
    Math.max(1, logs.filter((l) => l.latencyMs != null).length);
  return { total, errors, cacheHits, cacheMisses, switches, avgLatency: Math.round(avgLatency) };
}

/** Never log API key values — only key names */
export function maskSecret(value: string | undefined): string {
  if (!value) return "not_set";
  return value.length > 4 ? `***${value.slice(-4)}` : "***";
}
