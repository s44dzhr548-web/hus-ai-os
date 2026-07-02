import type { ProviderId } from "../types";
import { envKey } from "../config";
import { logEnterprise } from "./logging";

export interface ProviderRuntimeConfig {
  id: ProviderId;
  enabled: boolean;
  priority: number;
  weight: number;
  fallbackEnabled: boolean;
  rateLimitPerMinute: number;
  hasApiKey: boolean;
}

export interface FailoverEvent {
  id: string;
  symbol: string;
  fromProvider: string;
  toProvider: string;
  reason: string;
  createdAt: string;
  notified: boolean;
}

const failoverEvents: FailoverEvent[] = [];
const runtimeOverrides = new Map<string, Partial<ProviderRuntimeConfig>>();

const DEFAULT_CONFIG: Omit<ProviderRuntimeConfig, "id" | "hasApiKey"> = {
  enabled: true,
  priority: 50,
  weight: 1,
  fallbackEnabled: true,
  rateLimitPerMinute: 30,
};

export function getProviderConfig(id: ProviderId, envKeyName?: string): ProviderRuntimeConfig {
  const override = runtimeOverrides.get(id);
  const hasApiKey = envKeyName ? Boolean(envKey(envKeyName)) : true;
  return {
    id,
    hasApiKey,
    ...DEFAULT_CONFIG,
    ...override,
  };
}

export function updateProviderConfig(id: ProviderId, patch: Partial<ProviderRuntimeConfig>) {
  const current = runtimeOverrides.get(id) ?? {};
  runtimeOverrides.set(id, { ...current, ...patch, id });
  return getProviderConfig(id);
}

export function getAllProviderConfigs(ids: ProviderId[], envMap: Record<string, string | undefined>): ProviderRuntimeConfig[] {
  return ids.map((id) => getProviderConfig(id, envMap[id]));
}

export function recordFailover(symbol: string, fromProvider: string, toProvider: string, reason: string) {
  const event: FailoverEvent = {
    id: `fo-${Date.now()}`,
    symbol,
    fromProvider,
    toProvider,
    reason,
    createdAt: new Date().toISOString(),
    notified: true,
  };
  failoverEvents.unshift(event);
  if (failoverEvents.length > 500) failoverEvents.pop();
  logEnterprise({
    type: "provider_switch",
    providerId: toProvider,
    symbol,
    message: `Failover ${fromProvider} → ${toProvider}: ${reason}`,
  });
  return event;
}

export function getFailoverEvents(limit = 50) {
  return failoverEvents.slice(0, limit);
}

export function isAutomaticSwitchingEnabled() {
  return envKey("PROVIDER_AUTO_FAILOVER") !== "false";
}
