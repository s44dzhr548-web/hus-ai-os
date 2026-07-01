import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageProvider } from "./types";
import type { MediaKind } from "@/lib/media-types";
import { normalizeVideoFilename } from "@/lib/video-upload";

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  );
}

export function r2Endpoint(): string {
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

export function r2PublicBase(): string {
  return (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
}

export function r2Bucket(): string {
  return process.env.R2_BUCKET_NAME || "menuos-media";
}

export function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: r2Endpoint(),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function buildR2ObjectKey(
  filename: string,
  mediaType: MediaKind,
  restaurantId?: string
): string {
  const prefix = mediaType === "video" ? "media/videos" : "media/images";
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const scoped = restaurantId ? `${restaurantId}-${safeName}` : safeName;
  return `${prefix}/${scoped}`;
}

export function buildR2KeyFromFile(
  file: File,
  mediaType: MediaKind,
  restaurantId?: string
): string {
  if (mediaType === "video") {
    return buildR2ObjectKey(normalizeVideoFilename(file), "video", restaurantId);
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return buildR2ObjectKey(`image-${Date.now()}.${ext}`, "image", restaurantId);
}

export function publicUrlForKey(key: string): string {
  return `${r2PublicBase()}/${key}`;
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: expiresInSeconds });
}

export const r2StorageProvider: StorageProvider = {
  async upload(buffer, filename, contentType) {
    const key = buildR2ObjectKey(filename, contentType.startsWith("video/") ? "video" : "image");
    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: r2Bucket(),
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return { url: publicUrlForKey(key), key };
  },
};
