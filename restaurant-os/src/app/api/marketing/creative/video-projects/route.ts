import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess, marketingError } from "@/lib/marketing/auth";
import {
  getVideoProject,
  listVideoProjects,
  upsertVideoProject,
} from "@/lib/marketing/video-project-service";
import type { StoryboardScene } from "@/lib/marketing/video-studio-types";
import type { VideoBrandPayload } from "@/lib/marketing/video-brand-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const projectId = req.nextUrl.searchParams.get("id");
  if (projectId) {
    const project = await getVideoProject(restaurantId!, projectId);
    if (!project) return marketingError("المشروع غير موجود", 404);
    return NextResponse.json({ project });
  }

  const projects = await listVideoProjects(restaurantId!);
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;

  let body: {
    projectId?: string;
    name?: string;
    prompt?: string;
    providerKey?: string;
    mode?: string;
    aspectRatio?: string;
    durationSec?: number;
    modelId?: string;
    primaryAssetId?: string | null;
    referenceVideoAssetId?: string | null;
    brand?: VideoBrandPayload | null;
    storyboard?: StoryboardScene[];
    assetIds?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return marketingError("طلب غير صالح", 400);
  }

  try {
    const project = await upsertVideoProject({
      restaurantId: restaurantId!,
      userId: session!.user.id,
      projectId: body.projectId,
      name: body.name,
      prompt: body.prompt,
      providerKey: body.providerKey,
      mode: body.mode,
      aspectRatio: body.aspectRatio,
      durationSec: body.durationSec,
      modelId: body.modelId,
      primaryAssetId: body.primaryAssetId,
      referenceVideoAssetId: body.referenceVideoAssetId,
      brand: body.brand,
      storyboard: body.storyboard,
      assetIds: body.assetIds,
    });
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل الحفظ" },
      { status: 400 }
    );
  }
}
