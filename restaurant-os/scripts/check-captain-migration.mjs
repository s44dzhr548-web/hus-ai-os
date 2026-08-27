import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

loadMigrateEnv();
const prisma = new PrismaClient();

try {
  const cols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_source'
  `;
  console.log("order_source column:", cols.length ? "EXISTS" : "MISSING");

  const enums = await prisma.$queryRaw`
    SELECT enumlabel FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StaffRole')
    AND enumlabel = 'CAPTAIN'
  `;
  console.log("CAPTAIN role enum:", enums.length ? "EXISTS" : "MISSING");
} finally {
  await prisma.$disconnect();
}
