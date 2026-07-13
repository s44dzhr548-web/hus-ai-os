import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export async function getMarketingForecast(restaurantId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const orders = await prisma.order.findMany({
    where: {
      branch: { restaurantId },
      status: OrderStatus.COMPLETED,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { totalAmount: true, createdAt: true },
  });

  const reservations = await prisma.reservation.count({
    where: {
      restaurantId,
      date: {
        gte: now,
        lte: new Date(now.getTime() + 7 * 86400000),
      },
      status: { in: ["PENDING", "APPROVED", "CONFIRMED"] },
    },
  });

  const dailyAvg = orders.length > 0
    ? orders.reduce((s, o) => s + Number(o.totalAmount), 0) / 30
    : 0;

  const hourCounts = new Array(24).fill(0);
  for (const o of orders) {
    hourCounts[o.createdAt.getHours()]++;
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  const topProducts = await prisma.orderItem.groupBy({
    by: ["name"],
    where: {
      order: {
        branch: { restaurantId },
        status: OrderStatus.COMPLETED,
        createdAt: { gte: thirtyDaysAgo },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const isWeekend = [5, 6].includes(now.getDay());
  const weekendMultiplier = isWeekend ? 1.35 : 1;

  return {
    tomorrowSales: Math.round(dailyAvg * 1.05),
    weekendSales: Math.round(dailyAvg * 2.5 * weekendMultiplier),
    busyHours: [`${peakHour}:00`, `${(peakHour + 1) % 24}:00`, `${(peakHour + 2) % 24}:00`],
    upcomingReservations: reservations,
    bestProducts: topProducts.map((p) => ({
      name: p.name,
      quantity: p._sum.quantity ?? 0,
    })),
    opportunities: [
      peakHour >= 18 ? "ترويج عشاء" : "ترويج غداء",
      reservations > 5 ? "حملة حجوزات" : "حملة زيادة حجوزات",
      topProducts[0] ? `ترويج ${topProducts[0].name}` : "ترويج المنيو",
    ],
  };
}
