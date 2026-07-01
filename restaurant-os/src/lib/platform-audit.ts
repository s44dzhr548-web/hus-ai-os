import { logAudit } from "@/lib/audit";

export async function logPlatformAudit(params: {
  userId: string;
  restaurantId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: object;
}) {
  await logAudit({
    userId: params.userId,
    restaurantId: params.restaurantId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    metadata: {
      actorType: "PLATFORM_ADMIN",
      ...params.metadata,
    },
  });
}
