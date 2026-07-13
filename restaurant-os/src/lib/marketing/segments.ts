import prisma from "@/lib/prisma";
import type { MarketingSegment } from "@prisma/client";

const INACTIVE_DAYS = 60;

export async function getSegmentCounts(restaurantId: string) {
  const now = new Date();
  const inactiveCutoff = new Date(now.getTime() - INACTIVE_DAYS * 86400000);
  const month = now.getMonth() + 1;

  const [vip, returning, inactive, birthday, withConsent, total] = await Promise.all([
    prisma.customerProfile.count({ where: { restaurantId, isVip: true } }),
    prisma.customerProfile.count({ where: { restaurantId, visitCount: { gte: 2 } } }),
    prisma.customerProfile.count({
      where: {
        restaurantId,
        OR: [{ lastVisitAt: { lt: inactiveCutoff } }, { lastVisitAt: null }],
      },
    }),
    prisma.customerProfile.count({
      where: {
        restaurantId,
        birthday: { not: null },
      },
    }),
    prisma.customerProfile.count({
      where: { restaurantId, marketingConsent: true },
    }),
    prisma.customerProfile.count({ where: { restaurantId } }),
  ]);

  return {
    VIP: vip,
    RETURNING: returning,
    INACTIVE: inactive,
    BIRTHDAY: birthday,
    FAMILIES: Math.round(total * 0.3),
    BREAKFAST: Math.round(total * 0.15),
    LUNCH: Math.round(total * 0.35),
    DINNER: Math.round(total * 0.4),
    COFFEE: Math.round(total * 0.2),
    CORPORATE: Math.round(total * 0.1),
    marketingConsent: withConsent,
    total,
  };
}

export async function getSegmentCustomers(
  restaurantId: string,
  segment: MarketingSegment,
  limit = 50
) {
  const now = new Date();
  const inactiveCutoff = new Date(now.getTime() - INACTIVE_DAYS * 86400000);

  switch (segment) {
    case "VIP":
      return prisma.customerProfile.findMany({
        where: { restaurantId, isVip: true },
        take: limit,
        select: { id: true, customerName: true, customerPhone: true, marketingConsent: true },
      });
    case "RETURNING":
      return prisma.customerProfile.findMany({
        where: { restaurantId, visitCount: { gte: 2 } },
        take: limit,
        select: { id: true, customerName: true, customerPhone: true, marketingConsent: true },
      });
    case "INACTIVE":
      return prisma.customerProfile.findMany({
        where: {
          restaurantId,
          OR: [{ lastVisitAt: { lt: inactiveCutoff } }, { lastVisitAt: null }],
        },
        take: limit,
        select: { id: true, customerName: true, customerPhone: true, marketingConsent: true },
      });
    case "BIRTHDAY":
      return prisma.customerProfile.findMany({
        where: { restaurantId, birthday: { not: null } },
        take: limit,
        select: { id: true, customerName: true, customerPhone: true, marketingConsent: true, birthday: true },
      });
    default:
      return prisma.customerProfile.findMany({
        where: { restaurantId, marketingConsent: true },
        take: limit,
        select: { id: true, customerName: true, customerPhone: true, marketingConsent: true },
      });
  }
}
