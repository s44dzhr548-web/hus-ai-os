import { isR2Configured, r2StorageProvider } from "./r2";
import { isPermanentMediaUrl, PERMANENT_STORAGE_MESSAGE } from "./constants";
import type { StorageProvider, StorageUploadResult } from "./types";

export type { StorageProvider, StorageUploadResult } from "./types";
export {
  BLOB_SETUP_MESSAGE,
  isBlobMediaUrl,
  isLegacyMediaUrl,
  isPermanentMediaUrl,
  PERMANENT_STORAGE_MESSAGE,
} from "./constants";
export { isR2Configured } from "./r2";

export function getStorageProvider(): StorageProvider {
  if (!isR2Configured()) {
    throw new Error(PERMANENT_STORAGE_MESSAGE);
  }
  return r2StorageProvider;
}

export async function uploadMedia(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<StorageUploadResult> {
  const result = await getStorageProvider().upload(buffer, filename, contentType);
  if (!isPermanentMediaUrl(result.url)) {
    throw new Error(PERMANENT_STORAGE_MESSAGE);
  }
  return result;
}

export function storageStatus() {
  return {
    r2Configured: isR2Configured(),
    provider: isR2Configured() ? "r2" : "none",
    vercel: process.env.VERCEL === "1",
    missingEnvVars: getMissingR2EnvVars(),
  };
}

const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

export function getMissingR2EnvVars(): string[] {
  return R2_ENV_KEYS.filter((key) => !process.env[key]);
}
