import { checkRateLimit, rateLimitKey } from "./rate-limit";
import { cachedFetch } from "./cache";

export async function safeFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number; rateLimitProvider?: string }
): Promise<Response | null> {
  if (init?.rateLimitProvider) {
    const rl = checkRateLimit(rateLimitKey(init.rateLimitProvider, "fetch"));
    if (!rl.allowed) return null;
  }
  const timeoutMs = init?.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number; rateLimitProvider?: string; cacheKey?: string; cacheTtlMs?: number }
): Promise<T | null> {
  const fetcher = async () => {
    const res = await safeFetch(url, init);
    if (!res) return null;
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  };
  if (init?.cacheKey) {
    return cachedFetch(init.cacheKey, init.cacheTtlMs ?? 60_000, fetcher);
  }
  return fetcher();
}
