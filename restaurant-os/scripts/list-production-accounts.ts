/**
 * List production users, restaurants, and URLs (read-only).
 * Usage: npx tsx scripts/list-production-accounts.ts
 */
import { PrismaClient } from "@prisma/client";

const BASE =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "https://restaurant-os-nine.vercel.app";

const prisma = new PrismaClient();

function menuUrl(tableId: string, slug: string, tableCode: string | null) {
  if (slug && tableCode) return `${BASE}/r/${slug}/table/${tableCode}`;
  return `${BASE}/menu/${tableId}`;
}

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      restaurants: {
        include: {
          branches: {
            include: {
              tables: { orderBy: { number: "asc" }, take: 1 },
            },
          },
        },
      },
      staff: {
        include: {
          restaurant: {
            include: {
              branches: {
                include: {
                  tables: { orderBy: { number: "asc" }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
  });

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      owner: { select: { email: true, name: true, isPlatformAdmin: true } },
      branches: {
        include: {
          tables: { orderBy: { number: "asc" }, take: 1 },
        },
      },
    },
  });

  console.log(JSON.stringify({ baseUrl: BASE.replace(/\/$/, ""), users, restaurants }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
