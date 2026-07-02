import { getCached, setCached, cacheStats as memoryStats } from "./cache";
import { logEnterprise } from "./provider-manager/logging";

export type CacheLayer = "memory" | "redis" | "disk";

const diskCache = new Map<string, { value: unknown; expiresAt: number }>();
const redisUrl = process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_REST_URL;

const TTL = {
  quote: 30_000,
  candles: 120_000,
  news: 300_000,
  calendar: 600_000,
  symbol: 60_000,
} as const;

export { TTL };

export async function tieredGet<T>(key: string): Promise<{ hit: boolean; value: T | null; layer?: CacheLayer }> {
  const mem = getCached<T>(key);
  if (mem != null) return { hit: true, value: mem, layer: "memory" };

  const disk = diskCache.get(key);
  if (disk && Date.now() < disk.expiresAt) {
    setCached(key, disk.value as T, 15_000);
    return { hit: true, value: disk.value as T, layer: "disk" };
  }

  if (redisUrl) {
    try {
      const redisVal = await redisGet(key);
      if (redisVal != null) {
        const parsed = JSON.parse(redisVal) as T;
        setCached(key, parsed, 15_000);
        return { hit: true, value: parsed, layer: "redis" };
      }
    } catch {
      logEnterprise({ type: "error", message: "Redis cache read failed — using memory only" });
    }
  }

  return { hit: false, value: null };
}

export async function tieredSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  setCached(key, value, Math.min(ttlMs, 60_000));
  diskCache.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (diskCache.size > 500) {
    const first = diskCache.keys().next().value;
    if (first) diskCache.delete(first);
  }
  if (redisUrl) {
    try {
      await redisSet(key, JSON.stringify(value), Math.ceil(ttlMs / 1000));
    } catch {
      /* optional layer */
    }
  }
}

async function redisGet(key: string): Promise<string | null> {
  if (!redisUrl) return null;
  if (redisUrl.includes("upstash")) {
    const res = await fetch(`${redisUrl}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN ?? ""}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string };
    return json.result ?? null;
  }
  return null;
}

async function redisSet(key: string, value: string, exSeconds: number): Promise<void> {
  if (!redisUrl?.includes("upstash")) return;
  await fetch(`${redisUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${exSeconds}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN ?? ""}` },
  });
}

export function enterpriseCacheStats() {
  return {
    memory: memoryStats(),
    disk: { size: diskCache.size },
    redisConfigured: Boolean(redisUrl),
  };
}

export function cacheKeyFor(type: keyof typeof TTL, id: string) {
  return `${type}:${id}`;
}
