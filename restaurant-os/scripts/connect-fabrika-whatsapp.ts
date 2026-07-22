/**
 * Connect Fabrika Lounge WhatsApp from platform System User token.
 * Safe: upserts connection metadata only — no deletes, no mock numbers.
 *
 * Usage: npx tsx scripts/connect-fabrika-whatsapp.ts
 */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";

loadMigrateEnv();

import { PrismaClient } from "@prisma/client";
import {
  connectRestaurantFromPlatformDiscovery,
  verifyRestaurantWhatsAppLink,
} from "../src/lib/marketing/whatsapp-connection-service";

const prisma = new PrismaClient();
const FABRIKA_SLUG = process.env.FABRIKA_SLUG || "fabrika-mqkat9dw";
const NAME_HINT = process.env.WABA_NAME_HINT || "Fabrika";

async function main() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: FABRIKA_SLUG },
    select: { id: true, name: true, nameAr: true, slug: true },
  });
  if (!restaurant) throw new Error(`Restaurant not found: ${FABRIKA_SLUG}`);

  console.log(`\n=== Connect WhatsApp: ${restaurant.nameAr || restaurant.name} ===\n`);

  const saved = await connectRestaurantFromPlatformDiscovery(restaurant.id, { nameHint: NAME_HINT });
  console.log("Saved:", saved);

  const verify = await verifyRestaurantWhatsAppLink(restaurant.id);
  console.log("Verify:", verify.ok ? "PASS" : "FAIL");
  if (verify.issues?.length) console.log("Issues:", verify.issues.join(" · "));

  const conn = await prisma.whatsAppBusinessConnection.findUnique({
    where: { restaurantId: restaurant.id },
  });
  console.log("\nConnection record:");
  console.log("  metaBusinessId:", conn?.metaBusinessId ?? "—");
  console.log("  wabaId:", conn?.wabaId ?? "—");
  console.log("  phoneNumberId:", conn?.phoneNumberId ?? "—");
  console.log("  displayPhoneNumber:", conn?.businessPhone ?? "—");
  console.log("  connectionStatus:", conn?.connectionStatus ?? "—");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
