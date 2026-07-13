import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function salesInRange(restaurantId: string, from: Date, to: Date) {
  const orders = await prisma.order.findMany({
    where: {
      branch: { restaurantId },
      status: { in: [OrderStatus.COMPLETED, OrderStatus.READY] },
      createdAt: { gte: from, lt: to },
    },
    select: { totalAmount: true },
  });
  const total = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  return { total, count: orders.length };
}

export async function getMarketingDashboardMetrics(restaurantId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const [
    today,
    week,
    month,
    newCustomers,
    returningCustomers,
    reservations,
    whatsappEvents,
    adSpend,
    campaigns,
  ] = await Promise.all([
    salesInRange(restaurantId, todayStart, tomorrow),
    salesInRange(restaurantId, weekStart, tomorrow),
    salesInRange(restaurantId, monthStart, nextMonth),
    prisma.customerProfile.count({
      where: { restaurantId, createdAt: { gte: monthStart } },
    }),
    prisma.customerProfile.count({
      where: { restaurantId, visitCount: { gte: 2 } },
    }),
    prisma.reservation.count({
      where: { restaurantId, date: { gte: todayStart } },
    }),
    prisma.marketingEvent.count({
      where: { restaurantId, eventType: "WHATSAPP_CLICK", createdAt: { gte: monthStart } },
    }),
    prisma.marketingCampaign.aggregate({
      where: { restaurantId, deletedAt: null },
      _sum: { spent: true },
    }),
    prisma.marketingCampaign.count({
      where: { restaurantId, status: "ACTIVE", deletedAt: null },
    }),
  ]);

  const revenue = month.total;
  const advertisingSpend = Number(adSpend._sum.spent ?? 0);
  const marketingRoi =
    advertisingSpend > 0 ? ((revenue - advertisingSpend) / advertisingSpend) * 100 : null;

  const avgOrder = month.count > 0 ? month.total / month.count : 0;

  const aiScore = Math.min(
    100,
    Math.round(
      (month.count > 0 ? 25 : 0) +
        (reservations > 0 ? 20 : 0) +
        (returningCustomers > 5 ? 25 : 10) +
        (campaigns > 0 ? 20 : 0) +
        (whatsappEvents > 0 ? 10 : 5)
    )
  );

  return {
    todaySales: today.total,
    weeklySales: week.total,
    monthlySales: month.total,
    averageOrder: avgOrder,
    newCustomers,
    returningCustomers,
    reservations,
    whatsappClicks: whatsappEvents,
    revenue,
    marketingRoi,
    advertisingSpend,
    aiMarketingScore: aiScore,
    activeCampaigns: campaigns,
  };
}
