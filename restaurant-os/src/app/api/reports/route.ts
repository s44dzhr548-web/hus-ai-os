import { NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import { assertFeature } from "@/lib/permissions-engine";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const analyticsCheck = await assertFeature(restaurantId!, "analytics");
  if (analyticsCheck) return analyticsCheck;

  const reportsCheck = await assertFeature(restaurantId!, "reports");
  if (reportsCheck) return reportsCheck;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayOrders,
    monthOrders,
    allOrders,
    topItems,
    branchSales,
    paidOrderItems,
    mostViewed,
    mostOrdered,
    videoItemViews,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        branch: { restaurantId: restaurantId! },
        createdAt: { gte: startOfDay },
        status: { not: "CANCELLED" },
      },
      select: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: {
        branch: { restaurantId: restaurantId! },
        createdAt: { gte: startOfMonth },
        status: { not: "CANCELLED" },
      },
      select: { totalAmount: true },
    }),
    prisma.order.count({
      where: {
        branch: { restaurantId: restaurantId! },
        createdAt: { gte: startOfDay },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["name", "nameAr"],
      where: {
        order: {
          branch: { restaurantId: restaurantId! },
          status: { not: "CANCELLED" },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.groupBy({
      by: ["branchId"],
      where: {
        branch: { restaurantId: restaurantId! },
        createdAt: { gte: startOfMonth },
        status: { not: "CANCELLED" },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          branch: { restaurantId: restaurantId! },
          status: { not: "CANCELLED" },
          payments: { some: { status: "PAID" } },
        },
      },
      include: {
        menuItem: {
          include: { category: { select: { name: true, nameAr: true } } },
        },
      },
    }),
    prisma.menuItem.findMany({
      where: { category: { restaurantId: restaurantId! } },
      orderBy: { viewCount: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        nameAr: true,
        viewCount: true,
        orderCount: true,
        price: true,
      },
    }),
    prisma.menuItem.findMany({
      where: { category: { restaurantId: restaurantId! } },
      orderBy: { orderCount: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        nameAr: true,
        viewCount: true,
        orderCount: true,
      },
    }),
    prisma.menuItem.findMany({
      where: {
        category: { restaurantId: restaurantId! },
        videoUrl: { not: null },
      },
      orderBy: { viewCount: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        nameAr: true,
        viewCount: true,
        orderCount: true,
      },
    }),
  ]);

  const todaySales = todayOrders.reduce(
    (sum, o) => sum + Number(o.totalAmount),
    0
  );
  const monthSales = monthOrders.reduce(
    (sum, o) => sum + Number(o.totalAmount),
    0
  );
  const avgOrderValue =
    todayOrders.length > 0 ? todaySales / todayOrders.length : 0;

  const branches = await prisma.branch.findMany({
    where: { restaurantId: restaurantId! },
    select: { id: true, name: true, nameAr: true },
  });

  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b]));

  const categorySalesMap: Record<string, { name: string; sales: number; quantity: number }> = {};
  for (const item of paidOrderItems) {
    if (!item.menuItem) continue;
    const catName =
      item.menuItem.category.nameAr || item.menuItem.category.name || "أخرى";
    if (!categorySalesMap[catName]) {
      categorySalesMap[catName] = { name: catName, sales: 0, quantity: 0 };
    }
    categorySalesMap[catName].sales += Number(item.totalPrice);
    categorySalesMap[catName].quantity += item.quantity;
  }

  return NextResponse.json({
    todaySales,
    monthSales,
    todayOrders: allOrders,
    monthOrders: monthOrders.length,
    avgOrderValue,
    bestSellingItems: topItems.map((item) => ({
      name: item.nameAr || item.name,
      quantity: item._sum.quantity ?? 0,
    })),
    mostViewedItems: mostViewed.map((item) => ({
      name: item.nameAr || item.name,
      views: item.viewCount,
      orders: item.orderCount,
    })),
    mostOrderedItems: mostOrdered.map((item) => ({
      name: item.nameAr || item.name,
      orders: item.orderCount,
      views: item.viewCount,
    })),
    videoItemViews: videoItemViews.map((item) => ({
      name: item.nameAr || item.name,
      views: item.viewCount,
      orders: item.orderCount,
    })),
    salesByBranch: branchSales.map((b) => ({
      branch: branchMap[b.branchId],
      sales: Number(b._sum.totalAmount ?? 0),
      orders: b._count,
    })),
    salesByCategory: Object.values(categorySalesMap).sort(
      (a, b) => b.sales - a.sales
    ),
    lowestSellingItems: Object.values(
      paidOrderItems.reduce(
        (acc, item) => {
          const key = item.menuItemId || item.name;
          if (!acc[key]) {
            acc[key] = {
              name: item.nameAr || item.name,
              quantity: 0,
              sales: 0,
            };
          }
          acc[key].quantity += item.quantity;
          acc[key].sales += Number(item.totalPrice);
          return acc;
        },
        {} as Record<string, { name: string; quantity: number; sales: number }>
      )
    )
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5),
    conversionRates: mostViewed.map((item) => ({
      name: item.nameAr || item.name,
      views: item.viewCount,
      orders: item.orderCount,
      rate: item.viewCount > 0 ? (item.orderCount / item.viewCount) * 100 : 0,
    })),
  });
}
