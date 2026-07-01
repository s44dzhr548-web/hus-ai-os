import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  formatPermissionValue,
  type PermissionChange,
} from "@/lib/permission-fields";

export async function logPermissionChanges(params: {
  userId: string;
  restaurantId: string;
  subscriptionId: string;
  changes: PermissionChange[];
  reset?: boolean;
}) {
  if (params.changes.length === 0) return;

  const actor = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, email: true },
  });

  await logAudit({
    userId: params.userId,
    restaurantId: params.restaurantId,
    action: "PLATFORM_PERMISSIONS_CHANGE",
    entity: "Subscription",
    entityId: params.subscriptionId,
    metadata: {
      reset: params.reset ?? false,
      actor: actor
        ? { id: actor.id, name: actor.name, email: actor.email }
        : { id: params.userId },
      changes: params.changes.map((c) => ({
        field: c.field,
        fieldLabel: c.fieldLabel,
        oldValue: c.oldValue,
        newValue: c.newValue,
        oldDisplay: formatPermissionValue(c.field, c.oldValue),
        newDisplay: formatPermissionValue(c.field, c.newValue),
      })),
    },
  });
}

export async function getPermissionAuditLog(restaurantId: string, take = 50) {
  const logs = await prisma.auditLog.findMany({
    where: {
      restaurantId,
      action: "PLATFORM_PERMISSIONS_CHANGE",
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const userIds = [
    ...new Set(logs.map((l) => l.userId).filter(Boolean) as string[]),
  ];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    user: log.userId ? userMap[log.userId] || { id: log.userId } : null,
    metadata: log.metadata,
  }));
}
