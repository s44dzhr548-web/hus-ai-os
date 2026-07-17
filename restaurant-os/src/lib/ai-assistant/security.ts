import prisma from "@/lib/prisma";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const buckets = new Map<string, { count: number; reset: number }>();

export function checkAiAssistantRateLimit(restaurantId: string, userId: string): boolean {
  const key = `ai:${restaurantId}:${userId}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_REQUESTS) return false;
  bucket.count++;
  return true;
}

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]+/g,
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
  /EAA[A-Za-z0-9]+/g,
  /access_token["']?\s*[:=]\s*["'][^"']+["']/gi,
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, "[REDACTED]");
  }
  return out;
}

export function sanitizeForLog(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return redactSecrets(value);
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (/token|secret|password|key|enc/i.test(k)) {
        out[k] = "[REDACTED]";
      } else if (k === "customerPhone" && typeof v === "string") {
        out[k] = maskPhone(v);
      } else {
        out[k] = sanitizeForLog(v);
      }
    }
    return out;
  }
  return value;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

export function sanitizeForOpenAi(value: unknown): unknown {
  return sanitizeForLog(value);
}

export async function assertIdempotency(
  restaurantId: string,
  idempotencyKey: string
): Promise<boolean> {
  const existing = await prisma.aiAssistantActionLog.findUnique({
    where: {
      restaurantId_idempotencyKey: { restaurantId, idempotencyKey },
    },
    select: { id: true },
  });
  return !existing;
}

export function isQaSafeTarget(name?: string | null, reservationNumber?: string | null): boolean {
  const label = `${name || ""} ${reservationNumber || ""}`;
  return /qa|test|تجرب/i.test(label);
}
