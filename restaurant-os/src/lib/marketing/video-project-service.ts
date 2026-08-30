import prisma from "@/lib/prisma";
import type { StoryboardScene, VideoMediaAssetPublic } from "@/lib/marketing/video-studio-types";
import type { VideoBrandPayload } from "@/lib/marketing/video-brand-service";

export type ProjectPayload = {
  id: string;
  name: string;
  prompt: string;
  providerKey: string | null;
  mode: string;
  aspectRatio: string;
  durationSec: number;
  modelId: string | null;
  primaryAssetId: string | null;
  referenceVideoAssetId: string | null;
  brand: VideoBrandPayload | null;
  storyboard: StoryboardScene[];
  assetIds: string[];
  updatedAt: string;
};

function parseStoryboard(json: unknown): StoryboardScene[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x) => x && typeof x === "object") as StoryboardScene[];
}

function parseAssetIds(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x) => typeof x === "string") as string[];
}

export function toPublicAsset(row: {
  id: string;
  category: string;
  name: string | null;
  url: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl: string | null;
  durationSec: number | null;
  source: string;
  isPrimary: boolean;
  createdAt: Date;
}): VideoMediaAssetPublic {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    url: row.url,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    thumbnailUrl: row.thumbnailUrl,
    durationSec: row.durationSec,
    source: row.source,
    isPrimary: row.isPrimary,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listVideoProjects(restaurantId: string, limit = 20) {
  const rows = await prisma.marketingVideoStudioProject.findMany({
    where: { restaurantId },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map(projectToPayload);
}

export async function getVideoProject(restaurantId: string, projectId: string) {
  const row = await prisma.marketingVideoStudioProject.findFirst({
    where: { id: projectId, restaurantId },
  });
  if (!row) return null;
  return projectToPayload(row);
}

function projectToPayload(row: {
  id: string;
  name: string;
  prompt: string;
  providerKey: string | null;
  mode: string;
  aspectRatio: string;
  durationSec: number;
  modelId: string | null;
  primaryAssetId: string | null;
  referenceVideoAssetId: string | null;
  brandJson: unknown;
  storyboardJson: unknown;
  assetIdsJson: unknown;
  updatedAt: Date;
}): ProjectPayload {
  return {
    id: row.id,
    name: row.name,
    prompt: row.prompt,
    providerKey: row.providerKey,
    mode: row.mode,
    aspectRatio: row.aspectRatio,
    durationSec: row.durationSec,
    modelId: row.modelId,
    primaryAssetId: row.primaryAssetId,
    referenceVideoAssetId: row.referenceVideoAssetId,
    brand: (row.brandJson as VideoBrandPayload | null) ?? null,
    storyboard: parseStoryboard(row.storyboardJson),
    assetIds: parseAssetIds(row.assetIdsJson),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertVideoProject(params: {
  restaurantId: string;
  userId: string;
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
}) {
  const data = {
    name: params.name ?? "مشروع فيديو",
    prompt: params.prompt ?? "",
    providerKey: params.providerKey ?? null,
    mode: params.mode ?? "text_to_video",
    aspectRatio: params.aspectRatio ?? "9:16",
    durationSec: params.durationSec ?? 5,
    modelId: params.modelId ?? null,
    primaryAssetId: params.primaryAssetId ?? null,
    referenceVideoAssetId: params.referenceVideoAssetId ?? null,
    brandJson: params.brand ?? undefined,
    storyboardJson: params.storyboard ?? [],
    assetIdsJson: params.assetIds ?? [],
    createdBy: params.userId,
  };

  if (params.projectId) {
    const existing = await prisma.marketingVideoStudioProject.findFirst({
      where: { id: params.projectId, restaurantId: params.restaurantId },
    });
    if (!existing) throw new Error("المشروع غير موجود");
    const { createdBy: _c, ...updateData } = data;
    const updated = await prisma.marketingVideoStudioProject.update({
      where: { id: params.projectId },
      data: updateData,
    });
    return projectToPayload(updated);
  }

  const created = await prisma.marketingVideoStudioProject.create({
    data: {
      restaurantId: params.restaurantId,
      ...data,
    },
  });
  return projectToPayload(created);
}
