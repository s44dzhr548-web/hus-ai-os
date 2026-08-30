import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

loadMigrateEnv();
const p = new PrismaClient();
const j = await p.marketingVideoJob.findUnique({
  where: { id: "cms6kiejs0001jt04n8cdcw84" },
});
console.log(JSON.stringify(j, null, 2));
await p.$disconnect();
