/**
 * Create 100 tables with QR codes for the demo restaurant.
 * Run: npx tsx scripts/seed-100-tables.ts
 */
import { PrismaClient } from "@prisma/client";
import { tableCodeFor, menuUrlForTable } from "../src/lib/table-code";

const prisma = new PrismaClient();
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

async function main() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: "menu-os-demo" },
    include: { branches: { take: 1 } },
  });

  if (!restaurant?.branches[0]) {
    throw new Error("Demo restaurant or branch not found. Run npm run db:seed first.");
  }

  const branchId = restaurant.branches[0].id;
  const slug = restaurant.slug;

  await prisma.diningTable.deleteMany({ where: { branchId } });

  const created = [];
  for (let i = 1; i <= 100; i++) {
    const code = tableCodeFor(slug, i);
    const table = await prisma.diningTable.create({
      data: {
        branchId,
        number: i,
        label: `Table ${i}`,
        tableCode: code,
        capacity: 4,
        qrCode: menuUrlForTable("", slug, code),
      },
    });
    const updated = await prisma.diningTable.update({
      where: { id: table.id },
      data: { qrCode: menuUrlForTable(table.id, slug, code) },
    });
    created.push(updated);
  }

  console.log(`✅ Created ${created.length} tables with QR codes`);
  console.log(`🔗 Sample: ${appUrl}/r/${slug}/table/${tableCodeFor(slug, 1)}`);
  console.log(`🔗 Sample menu: ${appUrl}/menu/${created[0].id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
