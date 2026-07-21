export const OPENAI_MIN_OUTPUT_TOKENS = 16;
export const OPENAI_DEFAULT_TEST_OUTPUT_TOKENS = 64;

export type OpenAiErrorKind =
  | "invalid_key"
  | "quota"
  | "config"
  | "model"
  | "network"
  | "unknown";

export type OpenAiErrorInfo = {
  kind: OpenAiErrorKind;
  message: string;
  isInvalidKey: boolean;
};

export function clampMaxOutputTokens(requested?: number): number {
  const value = requested ?? OPENAI_DEFAULT_TEST_OUTPUT_TOKENS;
  return Math.max(value, OPENAI_MIN_OUTPUT_TOKENS);
}

function parseOpenAiErrorBody(body: string): { code: string; message: string } {
  try {
    const parsed = JSON.parse(body) as { error?: { code?: string; type?: string; message?: string } };
    const err = parsed.error ?? {};
    return {
      code: String(err.code || err.type || "").toLowerCase(),
      message: String(err.message || body),
    };
  } catch {
    return { code: "", message: body };
  }
}

export function classifyOpenAiError(status: number, body: string): OpenAiErrorInfo {
  const { code, message } = parseOpenAiErrorBody(body);
  const lower = message.toLowerCase();

  if (
    status === 401 ||
    code.includes("invalid_api_key") ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid api key")
  ) {
    return { kind: "invalid_key", message: "المفتاح غير صالح", isInvalidKey: true };
  }

  if (
    status === 429 ||
    code.includes("insufficient_quota") ||
    lower.includes("insufficient_quota") ||
    lower.includes("exceeded your current quota")
  ) {
    return {
      kind: "quota",
      message: "لا يوجد رصيد أو تم تجاوز الحصة",
      isInvalidKey: false,
    };
  }

  if (lower.includes("max_output_tokens") || (code.includes("invalid_request") && lower.includes("max_output"))) {
    return {
      kind: "config",
      message: "خطأ إعداد في المنصة",
      isInvalidKey: false,
    };
  }

  if (
    code.includes("model_not_found") ||
    (lower.includes("model") && (lower.includes("not found") || lower.includes("does not exist")))
  ) {
    return { kind: "model", message: "الموديل غير متاح", isInvalidKey: false };
  }

  if (status === 404 && lower.includes("model")) {
    return { kind: "model", message: "الموديل غير متاح", isInvalidKey: false };
  }

  return { kind: "unknown", message: "فشل الاتصال بـ OpenAI", isInvalidKey: false };
}

export function classifyOpenAiNetworkError(error: unknown): OpenAiErrorInfo {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("fetch failed"))
  ) {
    return { kind: "network", message: "تعذر الاتصال", isInvalidKey: false };
  }
  return { kind: "unknown", message: "تعذر الاتصال", isInvalidKey: false };
}

/** Redact secrets before logging OpenAI error bodies. */
export function redactOpenAiLogText(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
}
