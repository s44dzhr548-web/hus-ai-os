/**
 * Backfill OWNER staff records for restaurant owners missing staff link.
 * Run: npx tsx scripts/backfill-owner-staff.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    include: {
      owner: true,
      branches: { orderBy: { createdAt: "asc" }, take: 1 },
      staff: { where: { userId: undefined as unknown as string } },
    },
  });

  let created = 0;
  for (const restaurant of restaurants) {
    const existingStaff = await prisma.staff.findFirst({
      where: { userId: restaurant.ownerId, restaurantId: restaurant.id },
    });
    if (existingStaff) continue;

    const branch = restaurant.branches[0];
    if (!branch) continue;

    await prisma.staff.create({
      data: {
        userId: restaurant.ownerId,
        restaurantId: restaurant.id,
        branchId: branch.id,
        role: "OWNER",
        name: restaurant.owner.name || restaurant.owner.email,
        phone: restaurant.phone,
        isActive: true,
      },
    });
    created++;
  }

  console.log(`Backfilled ${created} OWNER staff records`);
}

main()
  .finally(() => prisma.$disconnect());
