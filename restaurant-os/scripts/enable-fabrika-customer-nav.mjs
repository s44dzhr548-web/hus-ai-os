/**
 * Enable Fabrika customer landing nav features (restaurant config only — no customer data changes).
 * Usage: node scripts/enable-fabrika-customer-nav.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "fabrika";

const PRIMARY_SECTIONS = [
  { id: "menu", enabled: true, order: 0 },
  { id: "reservations", enabled: true, order: 1 },
  { id: "gift", enabled: true, order: 2, titleAr: "الإهداء" },
  { id: "wishes", enabled: true, order: 3, titleAr: "الأمنيات" },
  { id: "song_request", enabled: true, order: 4, titleAr: "طلب أغنية" },
  { id: "offers", enabled: true, order: 5 },
  { id: "events", enabled: true, order: 6 },
];

async function main() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: SLUG },
    select: { id: true, name: true, homepageSections: true },
  });

  if (!restaurant) {
    console.error(`Restaurant slug "${SLUG}" not found`);
    process.exit(1);
  }

  const existing = Array.isArray(restaurant.homepageSections)
    ? [...restaurant.homepageSections]
    : [];

  const byId = new Map(existing.map((s) => [s.id, { ...s }]));

  for (const patch of PRIMARY_SECTIONS) {
    const current = byId.get(patch.id) || {};
    byId.set(patch.id, { ...current, ...patch });
  }

  const merged = [...byId.values()].sort(
    (a, b) => (a.order ?? 99) - (b.order ?? 99)
  );

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      tableGiftsEnabled: true,
      customerWishesEnabled: true,
      customerSongRequestsEnabled: true,
      homepageSections: merged,
    },
  });

  console.log(`✓ Enabled customer nav for ${restaurant.name} (${SLUG})`);
  console.log("  - tableGiftsEnabled: true");
  console.log("  - customerWishesEnabled: true");
  console.log("  - customerSongRequestsEnabled: true");
  console.log("  - homepage sections merged (additive)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
