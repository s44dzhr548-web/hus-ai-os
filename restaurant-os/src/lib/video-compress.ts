const COMPRESS_THRESHOLD_BYTES = 10 * 1024 * 1024;

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function pickRecorderMimeType(): string | null {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 1) {
      resolve();
      return;
    }
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("تعذر قراءة الفيديو"));
    setTimeout(() => reject(new Error("انتهت مهلة قراءة الفيديو")), 30_000);
  });
}

type VideoWithCapture = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

function getVideoCaptureStream(video: HTMLVideoElement): MediaStream | null {
  const el = video as VideoWithCapture;
  if (typeof el.captureStream === "function") return el.captureStream();
  if (typeof el.mozCaptureStream === "function") return el.mozCaptureStream();
  return null;
}

async function reencodeVideo(file: File): Promise<File> {
  const mimeType = pickRecorderMimeType();
  if (!mimeType) return file;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = objectUrl;

  try {
    await waitForVideoMetadata(video);
    const stream = getVideoCaptureStream(video);
    if (!stream) return file;

    const duration = Number.isFinite(video.duration) ? video.duration : 30;
    const targetBitrate = Math.min(
      2_500_000,
      Math.max(800_000, Math.floor((file.size * 8 * 0.55) / Math.max(duration, 1)))
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: targetBitrate });

      const finish = (result: Blob | null) => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(result);
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        if (!chunks.length) {
          finish(null);
          return;
        }
        finish(new Blob(chunks, { type: mimeType.split(";")[0] }));
      };

      recorder.onerror = () => finish(null);

      const timeoutMs = Math.min(Math.ceil(duration * 1000) + 10_000, 180_000);
      const timeout = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, timeoutMs);

      video.onended = () => {
        if (recorder.state === "recording") recorder.stop();
      };

      recorder.start(1000);
      video.play().catch(() => {
        window.clearTimeout(timeout);
        if (recorder.state === "recording") recorder.stop();
        else finish(null);
      });

      recorder.addEventListener("stop", () => window.clearTimeout(timeout), { once: true });
    });

    if (!blob || blob.size >= file.size) return file;

    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "video";
    return new File([blob], `${baseName}.${ext}`, { type: blob.type });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Skip on iOS — Safari MOV uploads must not be re-encoded client-side. */
export async function compressVideoIfNeeded(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (isIOS()) return file;
  if (file.size < COMPRESS_THRESHOLD_BYTES) return file;
  if (typeof MediaRecorder === "undefined") return file;

  try {
    return await reencodeVideo(file);
  } catch {
    return file;
  }
}
