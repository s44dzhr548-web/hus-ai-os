import {
  isAllowedImageFile,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
} from "@/lib/image-upload";
import {
  isAllowedVideoFile,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_MB,
  normalizeVideoContentType,
  videoMimeForExtension,
} from "@/lib/video-upload";
import type { MediaKind } from "@/lib/media-types";
import { PERMANENT_STORAGE_MESSAGE } from "@/lib/storage/constants";

export function isMovFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "mov" || file.type === "video/quicktime";
}

export const MOV_COMPAT_WARNING =
  "يفضل رفع MP4 لضمان التشغيل على جميع الأجهزة";

export function mediaContentType(file: File, mediaType: MediaKind): string {
  if (mediaType === "video") {
    return normalizeVideoContentType(file.name, file.type);
  }
  return file.type || "image/jpeg";
}

export function validateMediaUploadFile(file: File, mediaType: MediaKind): string | null {
  if (mediaType === "video") {
    if (!isAllowedVideoFile(file)) {
      return "صيغة فيديو غير مدعومة (mp4, mov, webm)";
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return `الحد الأقصى ${MAX_VIDEO_MB} ميجابايت`;
    }
    return null;
  }
  if (!isAllowedImageFile(file)) {
    return "صيغة صورة غير مدعومة (jpg, jpeg, png, webp)";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `الحد الأقصى ${MAX_IMAGE_MB} ميجابايت`;
  }
  return null;
}

async function uploadViaServerForm(
  file: File,
  type: "image" | "video",
  onProgress: (pct: number) => void,
  extraFormFields?: Record<string, string>
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    if (extraFormFields) {
      Object.entries(extraFormFields).forEach(([k, v]) => formData.append(k, v));
    }

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (!data.url || String(data.url).includes("/api/media/")) {
            reject(new Error(PERMANENT_STORAGE_MESSAGE));
            return;
          }
          resolve(data.url);
        } catch {
          reject(new Error("استجابة غير صالحة من الخادم"));
        }
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText);
        reject(new Error(data.error || `فشل الرفع (${xhr.status})`));
      } catch {
        reject(new Error(`فشل الرفع (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("فشل الاتصال بالخادم"));
    xhr.open("POST", "/api/upload");
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

export async function uploadMediaToR2(
  file: File,
  mediaType: MediaKind,
  onProgress: (pct: number) => void,
  extraPayload?: Record<string, string>
): Promise<string> {
  if (mediaType === "image") {
    return uploadViaServerForm(file, "image", onProgress, extraPayload);
  }

  const VERCEL_LIMIT = 4 * 1024 * 1024;
  if (file.size <= VERCEL_LIMIT) {
    try {
      return await uploadViaServerForm(file, "video", onProgress, extraPayload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (!message.includes("413") && !message.includes("كبير")) {
        throw err;
      }
    }
  }

  return uploadFileToR2(file, mediaType, onProgress, extraPayload);
}

async function uploadViaPresignedPut(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`فشل الرفع إلى R2 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("فشل الاتصال بـ R2"));
    xhr.ontimeout = () => reject(new Error("انتهت مهلة الرفع"));
    xhr.timeout = 600_000;
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}

export async function uploadFileToR2(
  file: File,
  mediaType: MediaKind,
  onProgress: (pct: number) => void,
  extraPayload?: Record<string, string>
): Promise<string> {
  const contentType = mediaContentType(file, mediaType);

  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      mediaType,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      restaurantId: extraPayload?.restaurantId,
    }),
  });

  const presignData = await presignRes.json().catch(() => ({}));
  if (!presignRes.ok) {
    throw new Error(presignData.error || PERMANENT_STORAGE_MESSAGE);
  }

  const { uploadUrl, publicUrl } = presignData as {
    uploadUrl?: string;
    publicUrl?: string;
  };

  if (!uploadUrl || !publicUrl) {
    throw new Error("استجابة غير صالحة من الخادم");
  }

  onProgress(5);
  await uploadViaPresignedPut(uploadUrl, file, contentType, (pct) => {
    onProgress(Math.max(5, Math.min(99, pct)));
  });

  return publicUrl;
}
