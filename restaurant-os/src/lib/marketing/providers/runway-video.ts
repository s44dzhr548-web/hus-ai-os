import { RUNWAY_API_VERSION } from "@/lib/marketing/providers/runway-api";

const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";

export type RunwayAspectPreset = "9:16" | "16:9" | "1:1";

const ASPECT_TO_RUNWAY: Record<RunwayAspectPreset, string> = {
  "9:16": "720:1280",
  "16:9": "1280:720",
  "1:1": "960:960",
};

export function runwayRatioFromPreset(preset: RunwayAspectPreset): string {
  return ASPECT_TO_RUNWAY[preset] ?? "1280:720";
}

function runwayHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Runway-Version": RUNWAY_API_VERSION,
    "Content-Type": "application/json",
  };
}

async function parseRunwayError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error?: string; message?: string; failure?: string };
    return j.error ?? j.message ?? j.failure ?? (text.slice(0, 200) || `HTTP ${res.status}`);
  } catch {
    return text.slice(0, 200) || `HTTP ${res.status}`;
  }
}

export type RunwayCreateParams = {
  apiKey: string;
  mode: "text_to_video" | "image_to_video";
  prompt: string;
  aspect: RunwayAspectPreset;
  durationSec: number;
  model?: string;
  promptImageDataUri?: string;
};

export async function runwayCreateVideoTask(params: RunwayCreateParams): Promise<{ taskId: string }> {
  const duration = Math.min(10, Math.max(2, params.durationSec));
  const model =
    params.mode === "image_to_video"
      ? params.model || "gen4.5"
      : params.model || "gen4.5";

  const ratio = runwayRatioFromPreset(params.aspect);
  const endpoint =
    params.mode === "image_to_video" ? `${RUNWAY_API_BASE}/image_to_video` : `${RUNWAY_API_BASE}/text_to_video`;

  const body: Record<string, unknown> = {
    model,
    promptText: params.prompt.trim(),
    ratio,
    duration,
  };

  if (params.mode === "image_to_video") {
    if (!params.promptImageDataUri?.startsWith("data:image/")) {
      throw new Error("صورة مرجعية مطلوبة لوضع صورة إلى فيديو");
    }
    body.promptImage = params.promptImageDataUri;
    if (model === "gen4_turbo" && !body.promptImage) {
      throw new Error("gen4_turbo يتطلب صورة مرجعية");
    }
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: runwayHeaders(params.apiKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("مفتاح Runway غير صالح أو لا يملك صلاحية");
  }

  if (!res.ok) {
    const msg = await parseRunwayError(res);
    if (/credit|balance|insufficient|payment/i.test(msg)) {
      throw new Error(`رصيد Runway غير كافٍ — ${msg}`);
    }
    throw new Error(msg);
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Runway لم يُرجع معرف مهمة");
  return { taskId: data.id };
}

export type RunwayTaskPoll = {
  status: string;
  progress?: number;
  outputUrl?: string;
  error?: string;
  done: boolean;
  succeeded: boolean;
};

function extractRunwayOutput(data: Record<string, unknown>): string | undefined {
  const output = data.output;
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    if (first && typeof first === "object" && "url" in first) {
      const url = (first as { url?: string }).url;
      if (url?.startsWith("http")) return url;
    }
  }
  const artifacts = data.artifacts;
  if (Array.isArray(artifacts) && artifacts.length > 0) {
    const a = artifacts[0] as { url?: string };
    if (a?.url?.startsWith("http")) return a.url;
  }
  return undefined;
}

export async function runwayPollTask(apiKey: string, taskId: string): Promise<RunwayTaskPoll> {
  const res = await fetch(`${RUNWAY_API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
    headers: runwayHeaders(apiKey),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    return {
      status: "FAILED",
      error: await parseRunwayError(res),
      done: true,
      succeeded: false,
    };
  }

  const data = (await res.json()) as {
    status?: string;
    progress?: number | null;
    output?: unknown;
    artifacts?: unknown;
    failure?: string;
    failureCode?: string;
  };

  const status = (data.status ?? "UNKNOWN").toUpperCase();
  const outputUrl = extractRunwayOutput(data as Record<string, unknown>);
  const failed = status === "FAILED" || status === "CANCELLED" || Boolean(data.failure);
  const succeeded = status === "SUCCEEDED" && Boolean(outputUrl);
  const done = succeeded || failed;

  const failureMsg = [data.failure, data.failureCode].filter(Boolean).join(" — ") || undefined;

  return {
    status,
    progress: typeof data.progress === "number" ? data.progress : undefined,
    outputUrl,
    error: failureMsg,
    done,
    succeeded,
  };
}

export const RUNWAY_STUDIO_MODELS = [
  { id: "gen4.5", labelAr: "Gen-4.5 (جودة عالية)" },
  { id: "gen4_turbo", labelAr: "Gen-4 Turbo (صورة → فيديو سريع)" },
] as const;

export const RUNWAY_DURATIONS = [5, 10] as const;
