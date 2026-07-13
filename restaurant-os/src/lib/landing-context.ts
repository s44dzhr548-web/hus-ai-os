import prisma from "@/lib/prisma";
import { formatTodayHours } from "@/lib/working-hours";
import type { CustomerHomepageContext } from "@/components/customer/customer-homepage";

export async function getLandingContext(
  restaurantId: string,
  branch?: {
    name: string;
    nameAr?: string | null;
    nameEn?: string | null;
    workingHours?: unknown;
  } | null,
  restaurantWorkingHours?: unknown
): Promise<CustomerHomepageContext> {
  const [ratingAgg] = await Promise.all([
    prisma.review.aggregate({
      where: { restaurantId },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const hoursRaw = branch?.workingHours ?? restaurantWorkingHours;
  const workingHoursLabel = formatTodayHours(hoursRaw, "ar");

  return {
    branchName: branch?.nameAr || branch?.name || null,
    branchNameEn: branch?.nameEn || branch?.name || null,
    workingHoursLabel,
    rating: ratingAgg._avg.rating,
    ratingCount: ratingAgg._count,
  };
}
