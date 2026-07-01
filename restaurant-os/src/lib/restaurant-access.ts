import prisma from "@/lib/prisma";
import { isPlatformAdminUser } from "@/lib/permissions";

export async function userCanAccessRestaurant(
  userId: string,
  restaurantId: string,
  isPlatformAdmin?: boolean
): Promise<boolean> {
  if (isPlatformAdmin) return true;

  const allowed = await prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      OR: [
        { ownerId: userId },
        { staff: { some: { userId, isActive: true } } },
      ],
    },
    select: { id: true },
  });

  return !!allowed;
}

export async function listUserRestaurantIds(userId: string): Promise<string[]> {
  const [owned, staff] = await Promise.all([
    prisma.restaurant.findMany({
      where: { ownerId: userId },
      select: { id: true },
    }),
    prisma.staff.findMany({
      where: { userId, isActive: true },
      select: { restaurantId: true },
    }),
  ]);

  return [...new Set([...owned.map((r) => r.id), ...staff.map((s) => s.restaurantId)])];
}

export type SessionUser = {
  id: string;
  isPlatformAdmin?: boolean;
  restaurantId?: string | null;
};

export async function validateSessionRestaurantPatch(
  user: SessionUser,
  restaurantId: string | null
): Promise<boolean> {
  if (isPlatformAdminUser(user)) return true;
  if (!restaurantId) return true;
  return userCanAccessRestaurant(user.id, restaurantId, false);
}
