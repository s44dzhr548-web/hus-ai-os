#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const [total, byRestaurant] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.groupBy({
      by: ["restaurantId"],
      _count: { _all: true },
    }),
  ]);
  console.log(
    JSON.stringify({
      total,
      byRestaurant: byRestaurant.map((r) => ({
        restaurantId: r.restaurantId,
        count: r._count._all,
      })),
    })
  );
} finally {
  await prisma.$disconnect();
}
