import prisma from "@/lib/prisma";

export async function logWhatsAppInboxAudit(input: {
  restaurantId: string;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  await prisma.whatsAppInboxAuditLog.create({
    data: {
      restaurantId: input.restaurantId,
      userId: input.userId || null,
      action: input.action,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      detailsJson: input.details ? (input.details as object) : undefined,
    },
  });
}
