import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

loadMigrateEnv();
const p = new PrismaClient();
const r = await p.restaurant.findUnique({
  where: { id: "cmqidth3w0002uodgg9ugg3wa" },
  select: { id: true, slug: true, name: true, nameAr: true },
});
console.log(JSON.stringify(r));
await p.$disconnect();
