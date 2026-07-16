import prisma from "@/lib/prisma";
import {
  DEFAULT_BUSINESS_DAY_CONFIG,
  type BusinessDayConfig,
} from "@/lib/business-day";

export async function getRestaurantBusinessDayConfig(
  restaurantId: string
): Promise<BusinessDayConfig> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { timezone: true, businessDayStartHour: true },
  });
  return {
    timezone: restaurant?.timezone ?? DEFAULT_BUSINESS_DAY_CONFIG.timezone,
    businessDayStartHour:
      restaurant?.businessDayStartHour ??
      DEFAULT_BUSINESS_DAY_CONFIG.businessDayStartHour,
  };
}
