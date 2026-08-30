import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { decryptApiKey } from "@/lib/marketing/providers/test-connection";
import {
  runwayCreateVideoTask,
  runwayPollTask,
  type RunwayAspectPreset,
} from "@/lib/marketing/providers/runway-video";
import { isProviderConnectionUsable } from "@/lib/marketing/providers/connection-status";
import {
  buildRunwayScenePrompt,
  enrichPromptWithReferenceImages,
  pickReferenceForRunway,
  type VideoBrandPayload,
} from "@/lib/marketing/video-brand-service";
import { applyVideoBrandingOverlay } from "@/lib/marketing/video-brand-overlay";
import { listConnectedVideoProvidersForStudio } from "@/lib/marketing/providers/connection-service";
import {
  assetUrlAsDataUriIfImage,
  getAssetsByIds,
} from "@/lib/marketing/video-media-library";
import { concatVideoClips } from "@/lib/marketing/video-concat";
import {
  IMAGE_TO_VIDEO_PROVIDERS,
  estimateRunwayCostUsd,
  normalizeVideoJobProgress,
  type StoryboardScene,
} from "@/lib/marketing/video-studio-types";
import { upsertVideoProject } from "@/lib/marketing/video-project-service";

export { listConnectedVideoProvidersForStudio };

export async function getVideoProviderApiKey(
  restaurantId: string,
  providerKey: string
): Promise<string | null> {
  const row = await prisma.marketingAiProviderConnection.findUnique({
    where: {
      restaurantId_category_providerKey: {
        restaurantId,
        category: "VIDEO",
        providerKey,
      },
    },
  });
  if (!row?.apiKeyEnc) return null;
  if (!isProviderConnectionUsable(row.status, true)) return null;
  return decryptApiKey(row.apiKeyEnc);
}

type SceneState = {
  assetId: string;
  taskId?: string;
  status: "pending" | "processing" | "done" | "failed";
  outputUrl?: string;
};

type MultiSceneMeta = {
  multiScene: true;
  scenes: SceneState[];
  currentIndex: number;
  referenceVideoAssetId?: string | null;
  brand?: VideoBrandPayload | null;
  perSceneDurationSec: number;
};

export type StartVideoJobInput = {
  restaurantId: string;
  userId: string;
  providerKey: string;
  prompt: string;
  aspect: RunwayAspectPreset;
  durationSec: number;
  model?: string;
  brand?: VideoBrandPayload;
  projectId?: string;
  storyboard?: StoryboardScene[];
  imageAssetIds?: string[];
  referenceVideoAssetId?: string | null;
  mode?: "text_to_video" | "image_to_video";
  saveProject?: boolean;
  projectName?: string;
};

async function resolveImageDataUri(restaurantId: string, assetId: string): Promise<string | undefined> {
  const [asset] = await getAssetsByIds(restaurantId, [assetId]);
  if (!asset || !asset.mimeType.startsWith("image/")) return undefined;
  return assetUrlAsDataUriIfImage(asset.url, asset.mimeType);
}

async function attachRestaurantBrandDefaults(
  restaurantId: string,
  brand: VideoBrandPayload | undefined
): Promise<VideoBrandPayload | undefined> {
  if (!brand) return brand;
  const [saved, restaurant] = await Promise.all([
    prisma.marketingVideoBrandSettings.findUnique({ where: { restaurantId } }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true, nameAr: true, logoUrl: true, primaryColor: true, secondaryColor: true, textColor: true },
    }),
  ]);
  const restaurantName = saved?.restaurantName ?? restaurant?.nameAr ?? restaurant?.name ?? brand.restaurantName;
  const logoUrl = saved?.logoUrl ?? restaurant?.logoUrl ?? brand.logoUrl;
  return {
    ...brand,
    restaurantName,
    logoUrl,
    primaryColor: brand.primaryColor || saved?.primaryColor || restaurant?.primaryColor || "#d4af37",
    secondaryColor: brand.secondaryColor || saved?.secondaryColor || restaurant?.secondaryColor || "#8b6914",
    textColor: brand.textColor || saved?.textColor || restaurant?.textColor || "#ffffff",
  };
}

export async function startVideoGenerationJob(input: StartVideoJobInput) {
  const userPromptRaw = input.prompt.trim();
  if (!userPromptRaw) throw new Error("وصف الفيديو (Prompt) مطلوب");

  const providerKey = input.providerKey.toUpperCase();
  if (!IMAGE_TO_VIDEO_PROVIDERS.has(providerKey) && providerKey !== "RUNWAY") {
    throw new Error(`المزود ${providerKey} غير مدعوم في الاستوديو`);
  }
  if (providerKey !== "RUNWAY") {
    throw new Error(
      `توليد ${providerKey} من الاستوديو قيد التفعيل — استخدم Runway المتصل حاليًا للصورة→فيديو متعدد المشاهد`
    );
  }

  const apiKey = await getVideoProviderApiKey(input.restaurantId, "RUNWAY");
  if (!apiKey) throw new Error("Runway غير متصل — اربط المزود من إعدادات المزودين");

  let brand = await attachRestaurantBrandDefaults(input.restaurantId, input.brand);

  const storyboardInput =
    input.storyboard?.filter((s) => s.assetId) ?? [];
  const imageAssetIds =
    input.imageAssetIds ??
    storyboardInput.map((s) => s.assetId!).filter(Boolean);

  let storyboard = storyboardInput;
  if (storyboard.length === 0 && imageAssetIds.length > 1) {
    storyboard = imageAssetIds.map((assetId, i) => ({
      id: `auto-${i}`,
      order: i,
      label: `المشهد ${i + 1}`,
      assetId,
    }));
  }

  const multiScene = storyboard.length > 1;
  const sceneCount = multiScene ? storyboard.length : 1;
  const enrichedPrompt = enrichPromptWithReferenceImages(userPromptRaw, imageAssetIds.length || sceneCount);
  const perSceneDurationSec = Math.min(10, Math.max(2, Math.floor(input.durationSec / sceneCount)));

  let projectId = input.projectId;
  if (input.saveProject !== false) {
    const project = await upsertVideoProject({
      restaurantId: input.restaurantId,
      userId: input.userId,
      projectId: input.projectId,
      name: input.projectName,
      prompt: enrichedPrompt,
      providerKey,
      mode: input.mode ?? (imageAssetIds.length ? "image_to_video" : "text_to_video"),
      aspectRatio: input.aspect,
      durationSec: input.durationSec,
      modelId: input.model,
      primaryAssetId: input.imageAssetIds?.[0] ?? storyboard[0]?.assetId ?? null,
      referenceVideoAssetId: input.referenceVideoAssetId ?? null,
      brand: brand ?? null,
      storyboard: input.storyboard ?? [],
      assetIds: imageAssetIds,
    });
    projectId = project.id;
  }

  const estimatedCost = estimateRunwayCostUsd(input.durationSec, sceneCount, input.model ?? "gen4.5");

  let mode: "text_to_video" | "image_to_video" = input.mode ?? "text_to_video";
  let promptImageDataUri: string | undefined;

  if (multiScene) {
    const firstId = storyboard[0]!.assetId!;
    promptImageDataUri = await resolveImageDataUri(input.restaurantId, firstId);
    if (!promptImageDataUri) throw new Error("تعذر تحميل صورة المشهد الأول");
    mode = "image_to_video";
    brand = brand
      ? { ...brand, referenceDataUri: promptImageDataUri }
      : ({ referenceDataUri: promptImageDataUri } as VideoBrandPayload);
  } else if (imageAssetIds.length === 1) {
    promptImageDataUri = await resolveImageDataUri(input.restaurantId, imageAssetIds[0]!);
    if (promptImageDataUri) {
      mode = "image_to_video";
      brand = brand
        ? { ...brand, referenceDataUri: promptImageDataUri }
        : ({ referenceDataUri: promptImageDataUri } as VideoBrandPayload);
    }
  } else if (brand) {
    const ref = pickReferenceForRunway(brand);
    mode = ref.mode;
    promptImageDataUri = ref.promptImageDataUri;
  }

  if (mode === "image_to_video" && !promptImageDataUri && !multiScene) {
    throw new Error("ارفع صورة مرجعية واحدة على الأقل لوضع صورة→فيديو");
  }

  const scenePrompt = buildRunwayScenePrompt(enrichedPrompt, {
    multiImage: sceneCount > 1,
    sceneIndex: 0,
  });

  const multiMeta: MultiSceneMeta | null = multiScene
    ? {
        multiScene: true,
        scenes: storyboard.map((s) => ({
          assetId: s.assetId!,
          status: "pending" as const,
        })),
        currentIndex: 0,
        referenceVideoAssetId: input.referenceVideoAssetId,
        brand: brand ?? null,
        perSceneDurationSec,
      }
    : null;

  if (multiMeta) {
    multiMeta.scenes[0]!.status = "processing";
  }

  const job = await prisma.marketingVideoJob.create({
    data: {
      restaurantId: input.restaurantId,
      providerKey: "RUNWAY",
      status: "PROCESSING",
      mode,
      prompt: enrichedPrompt,
      aspectRatio: input.aspect,
      durationSec: input.durationSec,
      modelId: input.model ?? "gen4.5",
      projectId: projectId ?? null,
      estimatedCost,
      metadataJson: {
        startedBy: input.userId,
        brand: brand ?? null,
        runwayScenePrompt: scenePrompt,
        referenceVideoAssetId: input.referenceVideoAssetId ?? null,
        multiScene: multiMeta,
      },
    },
  });

  try {
    const { taskId } = await runwayCreateVideoTask({
      apiKey,
      mode,
      prompt: scenePrompt,
      aspect: input.aspect,
      durationSec: multiScene ? perSceneDurationSec : input.durationSec,
      model: input.model,
      promptImageDataUri,
    });

    if (multiMeta) {
      multiMeta.scenes[0]!.taskId = taskId;
    }

    await prisma.marketingVideoJob.update({
      where: { id: job.id },
      data: {
        externalTaskId: taskId,
        status: "PROCESSING",
        metadataJson: {
          startedBy: input.userId,
          brand: brand ?? null,
          runwayScenePrompt: scenePrompt,
          referenceVideoAssetId: input.referenceVideoAssetId ?? null,
          multiScene: multiMeta,
        },
      },
    });

    return {
      jobId: job.id,
      projectId,
      externalTaskId: taskId,
      status: "PROCESSING" as const,
      estimatedCost,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل بدء التوليد";
    await prisma.marketingVideoJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message },
    });
    throw new Error(message);
  }
}

function brandFromJobMetadata(metadataJson: unknown): VideoBrandPayload | null {
  if (!metadataJson || typeof metadataJson !== "object") return null;
  const brand = (metadataJson as { brand?: VideoBrandPayload }).brand;
  return brand ?? null;
}

function multiFromMetadata(metadataJson: unknown): MultiSceneMeta | null {
  if (!metadataJson || typeof metadataJson !== "object") return null;
  const m = (metadataJson as { multiScene?: MultiSceneMeta }).multiScene;
  if (!m?.multiScene || !Array.isArray(m.scenes)) return null;
  return m;
}

async function startNextScene(
  restaurantId: string,
  job: {
    id: string;
    prompt: string;
    aspectRatio: string;
    modelId: string | null;
    metadataJson: unknown;
  },
  apiKey: string,
  meta: MultiSceneMeta,
  nextIndex: number
) {
  const assetId = meta.scenes[nextIndex]!.assetId;
  const promptImageDataUri = await resolveImageDataUri(restaurantId, assetId);
  if (!promptImageDataUri) {
    throw new Error(`تعذر تحميل صورة المشهد ${nextIndex + 1}`);
  }
  const scenePrompt = buildRunwayScenePrompt(job.prompt, {
    multiImage: true,
    sceneIndex: nextIndex,
  });
  const { taskId } = await runwayCreateVideoTask({
    apiKey,
    mode: "image_to_video",
    prompt: scenePrompt,
    aspect: job.aspectRatio as RunwayAspectPreset,
    durationSec: meta.perSceneDurationSec,
    model: job.modelId ?? undefined,
    promptImageDataUri,
  });
  meta.scenes[nextIndex]!.taskId = taskId;
  meta.scenes[nextIndex]!.status = "processing";
  meta.currentIndex = nextIndex;
  await prisma.marketingVideoJob.update({
    where: { id: job.id },
    data: {
      externalTaskId: taskId,
      status: "PROCESSING",
      metadataJson: {
        ...(typeof job.metadataJson === "object" && job.metadataJson ? job.metadataJson : {}),
        multiScene: meta,
        runwayScenePrompt: scenePrompt,
      },
    },
  });
}

type JobForFinalize = {
  id: string;
  prompt: string;
  providerKey: string;
  mode: string;
  aspectRatio: string;
  durationSec: number;
  modelId: string | null;
  externalTaskId: string | null;
  metadataJson: unknown;
  creativeId?: string | null;
  rawOutputUrl?: string | null;
};

function mergeJobMetadata(metadataJson: unknown, patch: Record<string, unknown>): Prisma.InputJsonValue {
  const base =
    metadataJson && typeof metadataJson === "object" ? (metadataJson as Record<string, unknown>) : {};
  return { ...base, ...patch } as Prisma.InputJsonValue;
}

/** Persist Runway output immediately so polling endpoints return fast (no FFmpeg blocking). */
async function markJobSucceededImmediate(restaurantId: string, job: JobForFinalize, rawUrl: string) {
  const brand = brandFromJobMetadata(job.metadataJson) ?? multiFromMetadata(job.metadataJson)?.brand ?? null;

  const creative = await prisma.marketingCreative.create({
    data: {
      restaurantId,
      type: "VIDEO_REEL",
      title: job.prompt.slice(0, 120),
      prompt: job.prompt,
      assetUrl: rawUrl,
      durationSec: job.durationSec,
      metadataJson: {
        provider: job.providerKey,
        mode: job.mode,
        aspectRatio: job.aspectRatio,
        model: job.modelId,
        runwayTaskId: job.externalTaskId,
        rawOutputUrl: rawUrl,
      },
    },
  });

  await prisma.marketingVideoJob.update({
    where: { id: job.id },
    data: {
      status: "SUCCEEDED",
      progress: 100,
      rawOutputUrl: rawUrl,
      outputUrl: rawUrl,
      finalOutputUrl: rawUrl,
      creativeId: creative.id,
      errorMessage: null,
      metadataJson: mergeJobMetadata(job.metadataJson, {
        runwayStatus: "SUCCEEDED",
        lastRunwayPollAt: new Date().toISOString(),
        brandingPending: Boolean(brand),
      }),
    },
  });
}

async function applyBrandingToCompletedJob(restaurantId: string, job: JobForFinalize) {
  const rawUrl = job.rawOutputUrl;
  if (!rawUrl || !job.creativeId) return;

  const brand = brandFromJobMetadata(job.metadataJson) ?? multiFromMetadata(job.metadataJson)?.brand ?? null;
  if (!brand) {
    await prisma.marketingVideoJob.update({
      where: { id: job.id },
      data: { metadataJson: mergeJobMetadata(job.metadataJson, { brandingPending: false }) },
    });
    return;
  }

  const branded = await applyVideoBrandingOverlay({
    rawVideoUrl: rawUrl,
    durationSec: job.durationSec,
    brand,
    restaurantId,
    jobId: job.id,
  });

  await prisma.marketingCreative.update({
    where: { id: job.creativeId },
    data: {
      assetUrl: branded.finalUrl,
      metadataJson: {
        provider: job.providerKey,
        mode: job.mode,
        aspectRatio: job.aspectRatio,
        model: job.modelId,
        runwayTaskId: job.externalTaskId,
        rawOutputUrl: rawUrl,
        brandingNote: branded.note,
      },
    },
  });

  await prisma.marketingVideoJob.update({
    where: { id: job.id },
    data: {
      finalOutputUrl: branded.finalUrl,
      outputUrl: branded.finalUrl,
      errorMessage: branded.note && branded.finalUrl === rawUrl ? branded.note : null,
      metadataJson: mergeJobMetadata(job.metadataJson, {
        brandingPending: false,
        brandingNote: branded.note ?? null,
      }),
    },
  });
}

export async function refreshVideoJobStatus(restaurantId: string, jobId: string) {
  const job = await prisma.marketingVideoJob.findFirst({
    where: { id: jobId, restaurantId },
  });
  if (!job) throw new Error("المهمة غير موجودة");

  const hasPlayableOutput = Boolean(job.rawOutputUrl || job.finalOutputUrl || job.outputUrl);

  if (job.status === "SUCCEEDED" && hasPlayableOutput) {
    return publicJobView(job);
  }
  if (job.status === "FAILED") {
    return publicJobView(job);
  }

  if (job.providerKey !== "RUNWAY" || !job.externalTaskId) {
    return publicJobView(job);
  }

  const apiKey = await getVideoProviderApiKey(restaurantId, "RUNWAY");
  if (!apiKey) {
    return publicJobView(job);
  }

  const meta = multiFromMetadata(job.metadataJson);
  const poll = await runwayPollTask(apiKey, job.externalTaskId);

  if (poll.succeeded && poll.outputUrl) {
    if (meta) {
      const idx = meta.currentIndex;
      meta.scenes[idx]!.status = "done";
      meta.scenes[idx]!.outputUrl = poll.outputUrl;

      const nextIndex = idx + 1;
      if (nextIndex < meta.scenes.length) {
        try {
          await startNextScene(restaurantId, job, apiKey, meta, nextIndex);
          return publicJobView(
            (await prisma.marketingVideoJob.findUnique({ where: { id: job.id } }))!
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : "فشل المشهد التالي";
          await prisma.marketingVideoJob.update({
            where: { id: job.id },
            data: { status: "FAILED", errorMessage: message },
          });
          return publicJobView(
            (await prisma.marketingVideoJob.findUnique({ where: { id: job.id } }))!
          );
        }
      }

      const clipUrls = meta.scenes.map((s) => s.outputUrl).filter(Boolean) as string[];
      let mergedRaw = clipUrls[0]!;
      if (clipUrls.length > 1) {
        try {
          mergedRaw = await concatVideoClips(clipUrls, restaurantId, job.id);
        } catch (e) {
          const message = e instanceof Error ? e.message : "فشل دمج المشاهد";
          await prisma.marketingVideoJob.update({
            where: { id: job.id },
            data: { status: "FAILED", errorMessage: message },
          });
          return publicJobView(
            (await prisma.marketingVideoJob.findUnique({ where: { id: job.id } }))!
          );
        }
      }

      await markJobSucceededImmediate(restaurantId, job, mergedRaw);
    } else {
      await markJobSucceededImmediate(restaurantId, job, poll.outputUrl);
    }
  } else if (poll.done && !poll.succeeded) {
    await prisma.marketingVideoJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: poll.error ?? poll.status ?? "فشل توليد الفيديو",
        progress: poll.progress != null ? poll.progress : undefined,
        metadataJson: mergeJobMetadata(job.metadataJson, {
          runwayStatus: poll.status,
          lastRunwayPollAt: new Date().toISOString(),
        }),
      },
    });
  } else {
    const liveProgress = poll.progress != null ? poll.progress : null;
    await prisma.marketingVideoJob.update({
      where: { id: job.id },
      data: {
        status: "PROCESSING",
        progress: liveProgress,
        metadataJson: mergeJobMetadata(job.metadataJson, {
          runwayStatus: poll.status,
          lastRunwayPollAt: new Date().toISOString(),
        }),
      },
    });
  }

  const updated = await prisma.marketingVideoJob.findUnique({ where: { id: job.id } });
  return publicJobView(updated!);
}

/** Poll Runway for in-flight jobs only — never creates a new generation task. */
async function refreshWithTimeout(restaurantId: string, jobId: string, ms = 25000) {
  return Promise.race([
    refreshVideoJobStatus(restaurantId, jobId),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function syncProcessingVideoJobs(restaurantId: string, limit = 5) {
  const processing = await prisma.marketingVideoJob.findMany({
    where: {
      restaurantId,
      status: { in: ["PROCESSING", "PENDING"] },
      providerKey: "RUNWAY",
      externalTaskId: { not: null },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true },
  });

  for (const row of processing) {
    try {
      await refreshWithTimeout(restaurantId, row.id);
    } catch {
      /* continue other jobs */
    }
  }
}

function publicJobView(job: {
  id: string;
  status: string;
  progress: number | null;
  outputUrl: string | null;
  rawOutputUrl: string | null;
  finalOutputUrl: string | null;
  errorMessage: string | null;
  creativeId: string | null;
  providerKey: string;
  mode: string;
  prompt: string;
  aspectRatio: string;
  durationSec: number;
  modelId: string | null;
  externalTaskId: string | null;
  projectId?: string | null;
  estimatedCost?: { toString(): string } | null;
  metadataJson?: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const meta =
    job.metadataJson && typeof job.metadataJson === "object"
      ? (job.metadataJson as { runwayStatus?: string; lastRunwayPollAt?: string })
      : {};
  const finalUrl = job.finalOutputUrl ?? job.outputUrl ?? job.rawOutputUrl;
  return {
    jobId: job.id,
    projectId: job.projectId,
    status: job.status,
    progress: job.status === "SUCCEEDED" ? 100 : normalizeVideoJobProgress(job.progress),
    outputUrl: finalUrl,
    rawOutputUrl: job.rawOutputUrl,
    finalOutputUrl: job.finalOutputUrl ?? finalUrl,
    error: job.errorMessage,
    creativeId: job.creativeId,
    providerKey: job.providerKey,
    mode: job.mode,
    prompt: job.prompt,
    aspectRatio: job.aspectRatio,
    durationSec: job.durationSec,
    modelId: job.modelId,
    externalTaskId: job.externalTaskId,
    runwayStatus: meta.runwayStatus ?? null,
    lastRunwayPollAt: meta.lastRunwayPollAt ?? null,
    estimatedCost: job.estimatedCost ? Number(job.estimatedCost) : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
