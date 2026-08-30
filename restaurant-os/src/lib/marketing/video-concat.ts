import { spawn } from "child_process";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import ffmpegPath from "ffmpeg-static";
import { uploadBufferToR2, isR2Configured } from "@/lib/storage/r2";

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
      else reject(new Error(err.slice(-600) || `ffmpeg exit ${code}`));
    });
  });
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function concatVideoClips(
  clipUrls: string[],
  restaurantId: string,
  jobId: string
): Promise<string> {
  if (!ffmpegPath) throw new Error("FFmpeg unavailable");
  if (clipUrls.length === 1) return clipUrls[0]!;

  const dir = await mkdtemp(join(tmpdir(), "menuhus-concat-"));
  try {
    const paths: string[] = [];
    for (let i = 0; i < clipUrls.length; i++) {
      const p = join(dir, `clip-${i}.mp4`);
      await writeFile(p, await download(clipUrls[i]!));
      paths.push(p);
    }
    const listPath = join(dir, "list.txt");
    await writeFile(listPath, paths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
    const outPath = join(dir, "merged.mp4");
    await runFfmpeg([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      "-y",
      outPath,
    ]);

    if (!isR2Configured()) {
      throw new Error("R2 not configured");
    }
    const buf = await readFile(outPath);
    const key = `media/videos/${restaurantId}-concat-${jobId}.mp4`;
    return uploadBufferToR2(buf, key, "video/mp4");
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
