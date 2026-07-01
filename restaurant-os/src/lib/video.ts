export function isEmbedVideo(url: string): boolean {
  return (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("embed")
  );
}

export function youtubeVideoId(url: string): string | null {
  const embedMatch = url.match(/embed\/([^?&/]+)/);
  if (embedMatch) return embedMatch[1];
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = url.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch) return shortMatch[1];
  return null;
}

export function youtubeThumbnail(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function embedAutoplayUrl(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  if (url.includes("autoplay=1")) return url;
  return `${url}${separator}autoplay=1&mute=1&playsinline=1`;
}
