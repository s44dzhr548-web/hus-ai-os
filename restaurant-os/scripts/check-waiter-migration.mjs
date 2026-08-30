import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

loadMigrateEnv();
const prisma = new PrismaClient();

try {
  const cols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name IN ('confirmed_at', 'public_access_token')
  `;
  console.log("confirmed_at/public_access_token:", cols.length >= 2 ? "EXISTS" : "MISSING", cols);

  const enums = await prisma.$queryRaw`
    SELECT enumlabel FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
    AND enumlabel = 'CONFIRMED'
  `;
  console.log("CONFIRMED status enum:", enums.length ? "EXISTS" : "MISSING");

  const hist = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'order_status_history'
  `;
  console.log("order_status_history table:", hist.length ? "EXISTS" : "MISSING");
} finally {
  await prisma.$disconnect();
}
