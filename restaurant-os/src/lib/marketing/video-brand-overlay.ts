import { spawn } from "child_process";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import ffmpegPath from "ffmpeg-static";
import type { LogoPosition, LogoTiming, VideoBrandPayload } from "@/lib/marketing/video-brand-service";
import { isR2Configured, uploadBufferToR2 } from "@/lib/storage/r2";

const NOTO_FONT_URL =
  "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf";

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Download failed HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function ensureFont(dir: string): Promise<string> {
  const fontPath = join(dir, "NotoSansArabic-Regular.ttf");
  try {
    await readFile(fontPath);
    return fontPath;
  } catch {
    const buf = await download(NOTO_FONT_URL);
    await writeFile(fontPath, buf);
    return fontPath;
  }
}

function logoOverlayCoords(position: LogoPosition): { x: string; y: string } {
  const pad = 24;
  switch (position) {
    case "top_left":
      return { x: String(pad), y: String(pad) };
    case "top_right":
      return { x: `W-w-${pad}`, y: String(pad) };
    case "bottom_left":
      return { x: String(pad), y: `H-h-${pad}` };
    case "bottom_center":
      return { x: `(W-w)/2`, y: `H-h-${pad}` };
    case "bottom_right":
    default:
      return { x: `W-w-${pad}`, y: `H-h-${pad}` };
  }
}

function timingEnable(timing: LogoTiming, durationSec: number): string | null {
  const d = Math.max(2, durationSec);
  switch (timing) {
    case "start":
      return `between(t\\,0\\,${Math.min(3, d)})`;
    case "end":
      return `gte(t\\,${Math.max(0, d - 3)})`;
    case "start_and_end":
      return `between(t\\,0\\,2)+between(t\\,${Math.max(0, d - 2)}\\,${d})`;
    case "full":
    default:
      return null;
  }
}

function escapePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "'\\''");
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = ffmpegPath || "ffmpeg";
    const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    proc.stderr?.on("data", (c) => {
      err += String(c);
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.slice(-800) || `ffmpeg exit ${code}`));
    });
  });
}

export async function applyVideoBrandingOverlay(params: {
  rawVideoUrl: string;
  durationSec: number;
  brand: VideoBrandPayload;
  restaurantId: string;
  jobId: string;
}): Promise<{ finalUrl: string; rawUrl: string; brandingApplied: boolean; note?: string }> {
  const rawUrl = params.rawVideoUrl;
  if (!ffmpegPath) {
    return { finalUrl: rawUrl, rawUrl, brandingApplied: false, note: "FFmpeg غير متاح" };
  }

  const dir = await mkdtemp(join(tmpdir(), "menuhus-brand-"));
  try {
    const videoPath = join(dir, "raw.mp4");
    const outPath = join(dir, "final.mp4");
    await writeFile(videoPath, await download(params.rawVideoUrl));

    const fontPath = await ensureFont(dir);
    const inputs = ["-i", videoPath];
    const filterParts: string[] = [];
    let videoOut = "0:v";

    if (params.brand.logoUrl) {
      try {
        const logoPath = join(dir, "logo.png");
        await writeFile(logoPath, await download(params.brand.logoUrl));
        inputs.push("-i", logoPath);
        const { x, y } = logoOverlayCoords(params.brand.logoPosition);
        const enable = timingEnable(params.brand.logoTiming, params.durationSec);
        filterParts.push("[1:v]scale=iw*0.18:-1[logo]");
        const overlay = enable
          ? `[0:v][logo]overlay=${x}:${y}:enable='${enable}'[vlogo]`
          : `[0:v][logo]overlay=${x}:${y}[vlogo]`;
        filterParts.push(overlay);
        videoOut = "vlogo";
      } catch {
        /* skip logo */
      }
    }

    const textLines: string[] = [];
    if (params.brand.showRestaurantName && params.brand.restaurantName) {
      textLines.push(params.brand.restaurantName);
    }
    if (params.brand.headline) textLines.push(params.brand.headline);
    if (params.brand.subheadline) textLines.push(params.brand.subheadline);
    if (params.brand.cta) textLines.push(params.brand.cta);

    if (textLines.length > 0) {
      const textPath = join(dir, "overlay.txt");
      await writeFile(textPath, textLines.join("\n"), "utf8");
      const fc = params.brand.textColor.startsWith("#")
        ? `0x${params.brand.textColor.slice(1)}`
        : params.brand.textColor;
      const bc = params.brand.primaryColor.startsWith("#")
        ? `0x${params.brand.primaryColor.slice(1)}@0.55`
        : `${params.brand.primaryColor}@0.55`;
      filterParts.push(
        `[${videoOut}]drawtext=fontfile='${escapePath(fontPath)}':textfile='${escapePath(textPath)}':fontcolor=${fc}:fontsize=34:line_spacing=10:x=(w-text_w)/2:y=h*0.72:box=1:boxcolor=${bc}:boxborderw=14[vout]`
      );
      videoOut = "vout";
    }

    const args = [...inputs];
    if (filterParts.length > 0) {
      args.push("-filter_complex", filterParts.join(";"), "-map", `[${videoOut}]`, "-map", "0:a?");
    } else {
      args.push("-map", "0:v", "-map", "0:a?");
    }
    args.push(
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "-y",
      outPath
    );

    await runFfmpeg(args);
    const outBuf = await readFile(outPath);

    if (!isR2Configured()) {
      return { finalUrl: rawUrl, rawUrl, brandingApplied: false, note: "R2 غير مهيأ" };
    }

    const key = `media/videos/${params.restaurantId}-branded-${params.jobId}.mp4`;
    const finalUrl = await uploadBufferToR2(outBuf, key, "video/mp4");
    return { finalUrl, rawUrl, brandingApplied: true };
  } catch (e) {
    return {
      finalUrl: rawUrl,
      rawUrl,
      brandingApplied: false,
      note: e instanceof Error ? e.message : "فشل طبقة الهوية",
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
