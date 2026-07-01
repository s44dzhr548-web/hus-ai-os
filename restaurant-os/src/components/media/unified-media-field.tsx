"use client";

import { Button } from "@/components/ui";
import { ImageIcon, Film } from "lucide-react";
import { MediaUploader } from "@/components/media/media-uploader";
import {
  applyMediaUpload,
  clearMediaField,
  type MediaFieldValue,
  type MediaKind,
} from "@/lib/media-types";

interface UnifiedMediaFieldProps {
  label?: string;
  value: MediaFieldValue;
  onChange: (value: MediaFieldValue) => void;
  extraFormFields?: Record<string, string>;
}

export function UnifiedMediaField({
  label = "الوسائط",
  value,
  onChange,
  extraFormFields,
}: UnifiedMediaFieldProps) {
  const activeUrl = value.mediaType === "video" ? value.videoUrl : value.imageUrl;

  function setMediaType(kind: MediaKind) {
    const previewUrl =
      kind === "video" ? value.videoUrl : value.imageUrl;
    onChange({ ...value, mediaType: kind, previewUrl });
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={value.mediaType === "image" ? "primary" : "outline"}
          onClick={() => setMediaType("image")}
        >
          <ImageIcon className="h-4 w-4" />
          صورة
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value.mediaType === "video" ? "primary" : "outline"}
          onClick={() => setMediaType("video")}
        >
          <Film className="h-4 w-4" />
          فيديو
        </Button>
      </div>
      <MediaUploader
        mediaType={value.mediaType}
        label={value.mediaType === "video" ? "رفع فيديو" : "رفع صورة"}
        value={activeUrl}
        onChange={(url) => onChange(applyMediaUpload(value, url, value.mediaType))}
        onClear={() => onChange(clearMediaField(value))}
        extraFormFields={extraFormFields}
      />
    </div>
  );
}
