const buckets = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_LIMIT = 30;
const WINDOW_MS = 60_000;

export function checkRateLimit(key: string, limit = DEFAULT_LIMIT): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count++;
  return { allowed: true };
}

export function rateLimitKey(provider: string, operation: string): string {
  return `${provider}:${operation}`;
}
