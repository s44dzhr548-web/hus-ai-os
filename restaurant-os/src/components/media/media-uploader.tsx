"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { FolderOpen, ImageIcon, Film, Images, X } from "lucide-react";
import { compressVideoIfNeeded } from "@/lib/video-compress";
import { isAllowedVideoFile, MAX_VIDEO_MB } from "@/lib/video-upload";
import { isAllowedImageFile, MAX_IMAGE_MB } from "@/lib/image-upload";
import {
  isMovFile,
  MOV_COMPAT_WARNING,
  uploadFileToR2,
  uploadMediaToR2,
} from "@/lib/r2-client-upload";
import { PERMANENT_STORAGE_MESSAGE } from "@/lib/storage/constants";
import type { MediaKind } from "@/lib/media-types";

export interface UploadDebugInfo {
  fileName: string;
  fileType: string;
  fileSize: string;
  endpointError: string;
}

interface MediaUploaderProps {
  /** Controls accepted file types and validation */
  mediaType: MediaKind;
  /** @deprecated use mediaType */
  type?: MediaKind;
  label: string;
  value?: string;
  onChange: (url: string) => void;
  onClear?: () => void;
  /** Passed to R2 presign payload (e.g. restaurantId for platform admin) */
  extraFormFields?: Record<string, string>;
}

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function buildUploadError(file: File, message: string): UploadDebugInfo {
  return {
    fileName: file.name || "(unknown)",
    fileType: file.type || "(empty)",
    fileSize: formatFileSize(file.size),
    endpointError: message,
  };
}

export function MediaUploader({
  mediaType: mediaTypeProp,
  type,
  label,
  value,
  onChange,
  onClear,
  extraFormFields,
}: MediaUploaderProps) {
  const mediaType = mediaTypeProp ?? type ?? "image";

  const libraryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<UploadDebugInfo | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [storageEnabled, setStorageEnabled] = useState(false);
  const [movWarning, setMovWarning] = useState(false);

  const accept = mediaType === "video" ? VIDEO_ACCEPT : IMAGE_ACCEPT;
  const maxMb = mediaType === "video" ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  const formats = mediaType === "video" ? "mp4, mov, webm" : "jpg, jpeg, png, webp";
  const libraryLabel = mediaType === "video" ? "مكتبة الفيديو" : "مكتبة الصور";
  const fileLabel = "اختر ملف";
  const uploadBlocked = !storageEnabled;

  useEffect(() => {
    fetch("/api/upload/config")
      .then((r) => r.json())
      .then((d) => setStorageEnabled(!!d.permanentStorageEnabled))
      .catch(() => setStorageEnabled(false));
  }, []);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  function clearLocalPreview() {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
  }

  function setUploadError(file: File, message: string) {
    setError(message);
    setDebugInfo(buildUploadError(file, message));
  }

  async function handleFile(file: File) {
    setError("");
    setDebugInfo(null);
    setMovWarning(mediaType === "video" && isMovFile(file));

    if (!storageEnabled) {
      setUploadError(file, PERMANENT_STORAGE_MESSAGE);
      return;
    }

    if (mediaType === "video") {
      if (!isAllowedVideoFile(file)) {
        setUploadError(file, "صيغة فيديو غير مدعومة (mp4, mov, webm)");
        return;
      }
    } else if (!isAllowedImageFile(file)) {
      setUploadError(file, "صيغة صورة غير مدعومة (jpg, jpeg, png, webp)");
      return;
    }

    if (file.size > maxMb * 1024 * 1024) {
      setUploadError(file, `الحد الأقصى ${maxMb} ميجابايت`);
      return;
    }

    if (localPreview) URL.revokeObjectURL(localPreview);
    const blobUrl = URL.createObjectURL(file);
    setLocalPreview(blobUrl);

    setUploading(true);
    setProgress(0);

    let uploadFile = file;
    if (mediaType === "video") {
      setCompressing(true);
      try {
        uploadFile = await compressVideoIfNeeded(file);
      } finally {
        setCompressing(false);
      }

      if (uploadFile.size > maxMb * 1024 * 1024) {
        setUploadError(uploadFile, `الحد الأقصى ${maxMb} ميجابايت`);
        setUploading(false);
        return;
      }
    }

    try {
      const url = await uploadMediaToR2(
        uploadFile,
        mediaType,
        setProgress,
        extraFormFields
      );
      clearLocalPreview();
      onChange(url);
      setProgress(100);
    } catch (e) {
      const message = e instanceof Error ? e.message : "فشل الرفع";
      setUploadError(uploadFile, message);
    } finally {
      setUploading(false);
      setCompressing(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  }

  function handleClear() {
    clearLocalPreview();
    setError("");
    setDebugInfo(null);
    onClear?.();
    onChange("");
  }

  const previewSrc = value || localPreview;
  const hasPreview = !!previewSrc;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>

      {uploadBlocked && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {PERMANENT_STORAGE_MESSAGE}
        </p>
      )}

      {hasPreview ? (
        <div className="relative overflow-hidden rounded-xl border bg-gray-50">
          {mediaType === "video" ? (
            <video
              key={previewSrc}
              src={previewSrc}
              controls={!!value}
              autoPlay={!value}
              muted
              loop={!value}
              playsInline
              preload="metadata"
              className="max-h-52 w-full object-cover"
              onError={() => {
                if (!uploading) setError("تعذر تشغيل معاينة الفيديو");
              }}
            />
          ) : (
            <img src={previewSrc} alt="" className="max-h-52 w-full object-cover" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
              {compressing ? "جاري ضغط الفيديو..." : `جاري الرفع ${progress}%`}
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
              aria-label="إزالة الوسائط"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-5 text-gray-500">
          {mediaType === "video" ? <Film className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
          <span className="text-sm text-center">
            {mediaType === "video"
              ? "اختر فيديو من المكتبة أو الملفات"
              : "اختر صورة من المكتبة أو الملفات"}
          </span>
          <span className="text-xs text-gray-400">
            {formats} — حتى {maxMb} ميجابايت
          </span>
        </div>
      )}

      {uploading && hasPreview && (
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-emerald-600 transition-all"
            style={{ width: `${compressing ? 12 : progress}%` }}
          />
        </div>
      )}

      {movWarning && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          {MOV_COMPAT_WARNING}
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="font-medium">{error}</p>
          {debugInfo && (
            <dl className="mt-2 space-y-1 font-mono text-[11px] text-red-600">
              <div className="flex gap-2">
                <dt className="shrink-0">الملف:</dt>
                <dd className="break-all">{debugInfo.fileName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">النوع:</dt>
                <dd>{debugInfo.fileType}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">الحجم:</dt>
                <dd>{debugInfo.fileSize}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">الخطأ:</dt>
                <dd className="break-all">{debugInfo.endpointError}</dd>
              </div>
            </dl>
          )}
        </div>
      )}

      <input
        ref={libraryInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
      />

      {!value && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => libraryInputRef.current?.click()}
            loading={uploading}
            disabled={uploading || uploadBlocked}
          >
            <Images className="h-4 w-4" />
            {libraryLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
            disabled={uploading || uploadBlocked}
          >
            <FolderOpen className="h-4 w-4" />
            {fileLabel}
          </Button>
        </div>
      )}

      {value && !uploading && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => libraryInputRef.current?.click()}
            disabled={uploadBlocked}
          >
            <Images className="h-4 w-4" />
            استبدال من {mediaType === "video" ? "مكتبة الفيديو" : "مكتبة الصور"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadBlocked}
          >
            <FolderOpen className="h-4 w-4" />
            استبدال ملف
          </Button>
        </div>
      )}
    </div>
  );
}

export function MenuSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-16 rounded-xl bg-gray-200" />
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-gray-200" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 rounded-2xl bg-gray-200" />
      ))}
    </div>
  );
}
