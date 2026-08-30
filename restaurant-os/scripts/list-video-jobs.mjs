import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

loadMigrateEnv();
const restaurantId = process.argv[2] || "cmqidth3w0002uodgg9ugg3wa";
const p = new PrismaClient();
const rows = await p.marketingVideoJob.findMany({
  where: { restaurantId },
  orderBy: { createdAt: "desc" },
  take: 10,
  select: { id: true, status: true, progress: true, externalTaskId: true, outputUrl: true },
});
console.log(JSON.stringify(rows, null, 2));
await p.$disconnect();
