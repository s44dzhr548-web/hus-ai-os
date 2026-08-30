import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess, marketingError } from "@/lib/marketing/auth";
import { getVideoProject } from "@/lib/marketing/video-project-service";
import { startVideoGenerationJob } from "@/lib/marketing/video-studio-service";
import type { RunwayAspectPreset } from "@/lib/marketing/providers/runway-video";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;
  const { id: projectId } = await ctx.params;

  const project = await getVideoProject(restaurantId!, projectId);
  if (!project) return marketingError("المشروع غير موجود", 404);

  const providerKey = (project.providerKey ?? "RUNWAY").toUpperCase();
  const aspect = (project.aspectRatio ?? "9:16") as RunwayAspectPreset;

  try {
    const result = await startVideoGenerationJob({
      restaurantId: restaurantId!,
      userId: session!.user.id,
      providerKey,
      prompt: project.prompt,
      aspect,
      durationSec: project.durationSec,
      model: project.modelId ?? undefined,
      brand: project.brand ?? undefined,
      projectId: project.id,
      storyboard: project.storyboard,
      imageAssetIds: project.assetIds,
      referenceVideoAssetId: project.referenceVideoAssetId,
      mode: project.mode as "text_to_video" | "image_to_video",
      saveProject: false,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "فشل التوليد" },
      { status: 400 }
    );
  }
}
