/**
 * Ensure demo restaurant has WhatsApp + payment test mode for production smoke tests.
 * Usage: npx tsx scripts/backfill-demo-restaurant.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.restaurant.updateMany({
    where: { slug: "menu-os-demo" },
    data: {
      whatsappNumber: "+966501234567",
      paymentTestMode: true,
    },
  });
  console.log(`Updated ${updated.count} demo restaurant(s)`);

  const sub = await prisma.subscription.updateMany({
    where: { restaurant: { slug: "menu-os-demo" } },
    data: { plan: "PRO", status: "ACTIVE" },
  });
  console.log(`Updated ${sub.count} subscription(s) to PRO/ACTIVE`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
