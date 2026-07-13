import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { isPlatformAdminUser } from "@/lib/permissions";

export function canManageProviderSecrets(session: Session | null): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  return role === "OWNER" || role === "ADMIN";
}

export function canUseProviders(session: Session | null): boolean {
  if (!session?.user) return false;
  return ["OWNER", "ADMIN", "MARKETING"].includes(session.user.role ?? "");
}

export function canViewConnectionStatus(session: Session | null): boolean {
  if (!session?.user) return false;
  return canUseProviders(session) || isPlatformAdminUser(session.user);
}

export async function logProviderAudit(
  restaurantId: string,
  userId: string | undefined,
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>
) {
  try {
    await prisma.marketingAuditLog.create({
      data: {
        restaurantId,
        userId,
        action,
        entityType,
        entityId,
        detailsJson: (details ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    /* audit best-effort */
  }
}
