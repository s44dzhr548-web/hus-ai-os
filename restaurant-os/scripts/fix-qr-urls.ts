/**
 * Update all table QR URLs to match NEXT_PUBLIC_APP_URL.
 */
import { PrismaClient } from "@prisma/client";
import { menuUrlForTable } from "../src/lib/table-code";

const prisma = new PrismaClient();
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://restaurant-os-nine.vercel.app";

async function main() {
  const tables = await prisma.diningTable.findMany({
    include: { branch: { include: { restaurant: { select: { slug: true } } } } },
  });

  for (const table of tables) {
    const slug = table.branch.restaurant.slug;
    await prisma.diningTable.update({
      where: { id: table.id },
      data: {
        qrCode: menuUrlForTable(table.id, slug, table.tableCode),
      },
    });
  }

  console.log(`✅ Updated ${tables.length} QR URLs to ${appUrl}`);
}

main()
  .finally(() => prisma.$disconnect());
