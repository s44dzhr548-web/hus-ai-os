import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

loadMigrateEnv();
const id = process.argv[2] || "8eaa7926-f13a-41af-83e9-706a4519d10d";
const p = new PrismaClient();

const jobs = await p.marketingVideoJob.findMany({
  where: {
    OR: [
      { id },
      { externalTaskId: id },
      { id: { contains: id.slice(0, 8) } },
      { externalTaskId: { contains: id.slice(0, 8) } },
    ],
  },
  take: 10,
});

console.log(JSON.stringify({ search: id, matches: jobs }, null, 2));

const qaJob = await p.marketingVideoJob.findUnique({
  where: { id: "cms6nnvgz0007l5046boph7r8" },
});
console.log("qa job", JSON.stringify(qaJob, null, 2));

await p.$disconnect();
