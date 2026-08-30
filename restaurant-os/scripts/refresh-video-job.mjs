import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";

loadMigrateEnv();

const jobId = process.argv[2] || "cms6kiejs0001jt04n8cdcw84";
const { refreshVideoJobStatus } = await import("../src/lib/marketing/video-studio-service.ts");
const prisma = (await import("../src/lib/prisma.ts")).default;

const row = await prisma.marketingVideoJob.findUnique({ where: { id: jobId } });
if (!row) {
  console.log(JSON.stringify({ error: "job not found" }));
  process.exit(1);
}

const view = await refreshVideoJobStatus(row.restaurantId, jobId);
console.log(
  JSON.stringify(
    {
      jobId: view.jobId,
      externalTaskId: row.externalTaskId,
      status: view.status,
      progress: view.progress,
      outputUrl: view.outputUrl,
      error: view.error,
    },
    null,
    2
  )
);

await prisma.$disconnect();
