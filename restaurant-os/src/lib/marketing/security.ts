import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const buckets = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(restaurantId: string, action = "default"): boolean {
  const key = `${restaurantId}:${action}`;
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

export async function logMarketingAudit(opts: {
  restaurantId: string;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await prisma.marketingAuditLog.create({
      data: {
        restaurantId: opts.restaurantId,
        userId: opts.userId ?? null,
        action: opts.action,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        detailsJson: (opts.details ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: opts.ipAddress ?? null,
      },
    });
  } catch {
    /* non-blocking */
  }
}
