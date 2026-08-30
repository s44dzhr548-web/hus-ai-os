import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { syncProcessingVideoJobs } from "@/lib/marketing/video-studio-service";
import { normalizeVideoJobProgress } from "@/lib/marketing/video-studio-types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const sync = req.nextUrl.searchParams.get("sync") === "1";
  if (sync) {
    try {
      await syncProcessingVideoJobs(restaurantId!, 5);
    } catch {
      /* still return DB rows */
    }
  }

  const jobs = await prisma.marketingVideoJob.findMany({
    where: { restaurantId: restaurantId! },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      status: true,
      prompt: true,
      mode: true,
      providerKey: true,
      durationSec: true,
      aspectRatio: true,
      modelId: true,
      progress: true,
      outputUrl: true,
      rawOutputUrl: true,
      finalOutputUrl: true,
      errorMessage: true,
      creativeId: true,
      projectId: true,
      externalTaskId: true,
      estimatedCost: true,
      metadataJson: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    jobs: jobs.map((j) => {
      const meta =
        j.metadataJson && typeof j.metadataJson === "object"
          ? (j.metadataJson as { runwayStatus?: string; lastRunwayPollAt?: string })
          : {};
      return {
        jobId: j.id,
        status: j.status,
        prompt: j.prompt.slice(0, 200),
        mode: j.mode,
        providerKey: j.providerKey,
        durationSec: j.durationSec,
        aspectRatio: j.aspectRatio,
        modelId: j.modelId,
        progress: j.status === "SUCCEEDED" ? 100 : normalizeVideoJobProgress(j.progress),
        outputUrl: j.finalOutputUrl ?? j.outputUrl ?? j.rawOutputUrl,
        finalOutputUrl: j.finalOutputUrl ?? j.outputUrl,
        rawOutputUrl: j.rawOutputUrl,
        error: j.errorMessage,
        creativeId: j.creativeId,
        projectId: j.projectId,
        externalTaskId: j.externalTaskId,
        runwayStatus: meta.runwayStatus ?? null,
        lastRunwayPollAt: meta.lastRunwayPollAt ?? null,
        estimatedCost: j.estimatedCost ? Number(j.estimatedCost) : null,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
      };
    }),
  });
}
