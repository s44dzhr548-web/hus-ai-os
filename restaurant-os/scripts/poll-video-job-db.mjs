import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

loadMigrateEnv();
const ids = process.argv.slice(2);
const p = new PrismaClient();

for (const id of ids) {
  const j = await p.marketingVideoJob.findFirst({
    where: { OR: [{ id }, { externalTaskId: id }] },
    select: {
      id: true,
      externalTaskId: true,
      status: true,
      progress: true,
      errorMessage: true,
      outputUrl: true,
      finalOutputUrl: true,
      creativeId: true,
    },
  });
  console.log(JSON.stringify(j));
}

await p.$disconnect();
