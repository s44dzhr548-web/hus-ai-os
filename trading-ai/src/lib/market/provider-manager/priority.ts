import type { ProviderChainEntry } from "./chains";
import type { ProviderRuntimeHealth } from "./health";

export type PriorityStrategy = "fastest" | "cheapest" | "reliable" | "ai_auto";

export function selectProviderByStrategy(
  candidates: { entry: ProviderChainEntry; health: ProviderRuntimeHealth; available: boolean }[],
  strategy: PriorityStrategy = "ai_auto"
): ProviderChainEntry | null {
  const available = candidates.filter((c) => c.available && c.health.status !== "disabled");
  if (available.length === 0) return null;

  if (strategy === "cheapest") {
    return [...available].sort((a, b) => a.entry.costPerCallUsd - b.entry.costPerCallUsd)[0].entry;
  }
  if (strategy === "fastest") {
    return [...available].sort((a, b) => a.health.latencyMs - b.health.latencyMs)[0].entry;
  }
  if (strategy === "reliable") {
    return [...available].sort((a, b) => b.health.availabilityPct - a.health.availabilityPct)[0].entry;
  }

  // AI auto: score = reliability * 0.5 + speed * 0.3 + cost * 0.2
  const scored = available.map((c) => {
    const speedScore = c.health.latencyMs > 0 ? Math.min(100, 1000 / c.health.latencyMs) : 50;
    const costScore = c.entry.costPerCallUsd === 0 ? 100 : Math.max(10, 100 - c.entry.costPerCallUsd * 10000);
    const score = c.health.availabilityPct * 0.5 + speedScore * 0.3 + costScore * 0.2;
    return { entry: c.entry, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].entry;
}

export function getActivePriorityStrategy(): PriorityStrategy {
  const env = process.env.PROVIDER_PRIORITY_STRATEGY?.toLowerCase();
  if (env === "fastest" || env === "cheapest" || env === "reliable") return env;
  return "ai_auto";
}
