import prisma from "@/lib/prisma";

export async function logAudit(params: {
  restaurantId?: string | null;
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: object;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        restaurantId: params.restaurantId || null,
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata,
      },
    });
  } catch (e) {
    console.error("[audit]", e);
  }
}
