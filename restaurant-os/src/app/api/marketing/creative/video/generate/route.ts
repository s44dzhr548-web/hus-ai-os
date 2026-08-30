import { NextRequest, NextResponse } from "next/server";

import { requireMarketingAccess, marketingError } from "@/lib/marketing/auth";

import { startVideoGenerationJob } from "@/lib/marketing/video-studio-service";

import type { RunwayAspectPreset } from "@/lib/marketing/providers/runway-video";

import type { VideoBrandPayload } from "@/lib/marketing/video-brand-service";

import type { StoryboardScene } from "@/lib/marketing/video-studio-types";



export const dynamic = "force-dynamic";

export const maxDuration = 300;



export async function POST(req: NextRequest) {

  const { error, restaurantId, session } = await requireMarketingAccess();

  if (error) return error;



  let body: {

    providerKey?: string;

    prompt?: string;

    aspect?: string;

    durationSec?: number;

    model?: string;

    brand?: VideoBrandPayload;

    mode?: string;

    promptImageDataUri?: string;

    projectId?: string;

    projectName?: string;

    storyboard?: StoryboardScene[];

    imageAssetIds?: string[];

    referenceVideoAssetId?: string | null;

    saveProject?: boolean;

  };



  try {

    body = await req.json();

  } catch {

    return marketingError("طلب غير صالح", 400);

  }



  const providerKey = (body.providerKey ?? "RUNWAY").toUpperCase();

  const aspect = (body.aspect ?? "9:16") as RunwayAspectPreset;

  if (!["9:16", "16:9", "1:1"].includes(aspect)) {

    return marketingError("مقاس غير مدعوم", 400);

  }



  const durationSec = Number(body.durationSec ?? 5);

  const prompt = typeof body.prompt === "string" ? body.prompt : "";



  let brand = body.brand;

  if (brand && body.promptImageDataUri && !brand.referenceDataUri) {

    brand = { ...brand, referenceDataUri: body.promptImageDataUri };

  }



  try {

    const result = await startVideoGenerationJob({

      restaurantId: restaurantId!,

      userId: session!.user.id,

      providerKey,

      prompt,

      aspect,

      durationSec,

      model: body.model,

      brand,

      projectId: body.projectId,

      projectName: body.projectName,

      storyboard: body.storyboard,

      imageAssetIds: body.imageAssetIds,

      referenceVideoAssetId: body.referenceVideoAssetId,

      mode: body.mode as "text_to_video" | "image_to_video" | undefined,

      saveProject: body.saveProject,

    });

    return NextResponse.json(result);

  } catch (e) {

    return NextResponse.json(

      { ok: false, error: e instanceof Error ? e.message : "فشل التوليد" },

      { status: 400 }

    );

  }

}

