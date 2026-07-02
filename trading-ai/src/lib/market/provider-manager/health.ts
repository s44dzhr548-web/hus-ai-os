import type { ProviderId } from "../types";
import { logEnterprise } from "./logging";

export type PriceDataStatus = "live" | "delayed" | "cached" | "demo" | "estimated" | "unavailable";

export interface ProviderRuntimeHealth {
  id: ProviderId;
  name: string;
  status: "healthy" | "degraded" | "down" | "requires_key" | "disabled";
  latencyMs: number;
  lastUpdate: string;
  apiUsage: number;
  monthlyCostUsd: number;
  quotaRemaining?: number;
  errors: number;
  availabilityPct: number;
  isActive: boolean;
  isBackup: boolean;
  automaticSwitching: boolean;
}

const healthState = new Map<
  ProviderId,
  { latencyMs: number; errors: number; successes: number; lastUpdate: string; apiUsage: number }
>();

export function recordProviderSuccess(id: ProviderId, latencyMs: number) {
  const prev = healthState.get(id) ?? { latencyMs: 0, errors: 0, successes: 0, lastUpdate: new Date().toISOString(), apiUsage: 0 };
  prev.latencyMs = Math.round(prev.latencyMs * 0.7 + latencyMs * 0.3);
  prev.successes += 1;
  prev.apiUsage += 1;
  prev.lastUpdate = new Date().toISOString();
  healthState.set(id, prev);
  logEnterprise({ type: "latency", providerId: id, latencyMs, message: `Provider ${id} OK ${latencyMs}ms` });
}

export function recordProviderFailure(id: ProviderId, error: string) {
  const prev = healthState.get(id) ?? { latencyMs: 0, errors: 0, successes: 0, lastUpdate: new Date().toISOString(), apiUsage: 0 };
  prev.errors += 1;
  prev.lastUpdate = new Date().toISOString();
  healthState.set(id, prev);
  logEnterprise({ type: "error", providerId: id, message: error });
}

export function buildRuntimeHealth(
  id: ProviderId,
  name: string,
  opts: {
    hasApiKey: boolean;
    enabled: boolean;
    isActive: boolean;
    isBackup: boolean;
    automaticSwitching: boolean;
    monthlyCostUsd: number;
    quotaRemaining?: number;
  }
): ProviderRuntimeHealth {
  const state = healthState.get(id);
  const total = (state?.successes ?? 0) + (state?.errors ?? 0);
  const availabilityPct = total > 0 ? Math.round(((state?.successes ?? 0) / total) * 100) : opts.hasApiKey || id === "yahoo" ? 99 : 0;

  let status: ProviderRuntimeHealth["status"] = "healthy";
  if (!opts.enabled) status = "disabled";
  else if (!opts.hasApiKey && !["yahoo", "coingecko", "binance", "frankfurter", "tadawul", "mock"].includes(id)) status = "requires_key";
  else if (availabilityPct < 50) status = "down";
  else if (availabilityPct < 85 || (state?.latencyMs ?? 0) > 2000) status = "degraded";

  return {
    id,
    name,
    status,
    latencyMs: state?.latencyMs ?? 0,
    lastUpdate: state?.lastUpdate ?? new Date().toISOString(),
    apiUsage: state?.apiUsage ?? 0,
    monthlyCostUsd: opts.monthlyCostUsd,
    quotaRemaining: opts.quotaRemaining,
    errors: state?.errors ?? 0,
    availabilityPct,
    isActive: opts.isActive,
    isBackup: opts.isBackup,
    automaticSwitching: opts.automaticSwitching,
  };
}

export function inferDataStatus(opts: {
  isDemoData: boolean;
  cacheHit: boolean;
  cacheLayer?: string;
  source: ProviderId;
}): PriceDataStatus {
  if (opts.isDemoData) return "demo";
  if (opts.cacheHit) return "cached";
  if (opts.source === "yahoo") return "delayed";
  if (["polygon", "finnhub", "binance", "coingecko"].includes(opts.source)) return "live";
  return "estimated";
}
