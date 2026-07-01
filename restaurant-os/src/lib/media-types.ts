export type MediaKind = "image" | "video";

export type DbMediaType = "IMAGE" | "VIDEO";

export interface MediaFieldValue {
  mediaType: MediaKind;
  imageUrl: string;
  videoUrl: string;
  previewUrl: string;
}

export function dbToMediaKind(type?: DbMediaType | string | null): MediaKind {
  return type === "VIDEO" ? "video" : "image";
}

export function mediaKindToDb(type: MediaKind): DbMediaType {
  return type === "video" ? "VIDEO" : "IMAGE";
}

export function emptyMediaField(kind: MediaKind = "image"): MediaFieldValue {
  return { mediaType: kind, imageUrl: "", videoUrl: "", previewUrl: "" };
}

export function mediaFieldFromDb(data: {
  mediaType?: DbMediaType | string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  previewUrl?: string | null;
}): MediaFieldValue {
  const mediaType = dbToMediaKind(data.mediaType);
  const imageUrl = data.imageUrl || "";
  const videoUrl = data.videoUrl || "";
  const previewUrl =
    data.previewUrl ||
    (mediaType === "video" ? videoUrl : imageUrl) ||
    "";
  return { mediaType, imageUrl, videoUrl, previewUrl };
}

export function applyMediaUpload(
  current: MediaFieldValue,
  url: string,
  kind: MediaKind
): MediaFieldValue {
  if (kind === "video") {
    return {
      mediaType: "video",
      imageUrl: current.imageUrl,
      videoUrl: url,
      previewUrl: url,
    };
  }
  return {
    mediaType: "image",
    imageUrl: url,
    videoUrl: current.videoUrl,
    previewUrl: url,
  };
}

export function clearMediaField(current: MediaFieldValue): MediaFieldValue {
  return {
    ...current,
    imageUrl: current.mediaType === "image" ? "" : current.imageUrl,
    videoUrl: current.mediaType === "video" ? "" : current.videoUrl,
    previewUrl: "",
  };
}

export function toDbMediaPayload(field: MediaFieldValue) {
  const previewUrl =
    field.previewUrl ||
    (field.mediaType === "video" ? field.videoUrl : field.imageUrl) ||
    null;
  return {
    mediaType: mediaKindToDb(field.mediaType),
    imageUrl: field.mediaType === "image" ? field.imageUrl || null : field.imageUrl || null,
    videoUrl: field.mediaType === "video" ? field.videoUrl || null : field.videoUrl || null,
    previewUrl,
  };
}
