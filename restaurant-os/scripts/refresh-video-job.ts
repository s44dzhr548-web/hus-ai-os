import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import prisma from "../src/lib/prisma";
import { refreshVideoJobStatus } from "../src/lib/marketing/video-studio-service";

loadMigrateEnv();

function loadLocalSecrets() {
  for (const name of [".env.vercel.prod", ".env.local", ".env.production.local"]) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*(MARKETING_TOKEN_SECRET|INTEGRATION_ENCRYPTION_KEY)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadLocalSecrets();

const arg = process.argv[2] || "8eaa7926-f13a-41af-83e9-706a4519d10d";

async function main() {
  const row = await prisma.marketingVideoJob.findFirst({
    where: {
      OR: [{ id: arg }, { externalTaskId: arg }],
    },
  });
  if (!row) {
    console.log(JSON.stringify({ error: "job not found", search: arg }));
    process.exit(1);
  }

  const view = await refreshVideoJobStatus(row.restaurantId, row.id);
  console.log(
    JSON.stringify(
      {
        internalJobId: row.id,
        runwayTaskId: row.externalTaskId,
        status: view.status,
        progress: view.progress,
        outputUrl: view.outputUrl,
        finalOutputUrl: view.finalOutputUrl,
        error: view.error,
        creativeId: view.creativeId,
      },
      null,
      2
    )
  );
}

main()
  .finally(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
