import { encryptToken, decryptToken, canEncryptTokens } from "@/lib/marketing/encryption";

export async function testOpenAiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return { ok: true };
    const body = await res.text();
    return { ok: false, error: body.slice(0, 200) || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
  }
}

export async function testAnthropicKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok || res.status === 400) return { ok: true };
    if (res.status === 401) return { ok: false, error: "Invalid API key" };
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
  }
}

export async function testGeminiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (res.ok) return { ok: true };
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
  }
}

export async function testProviderConnection(
  providerKey: string,
  apiKey: string,
  endpointUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey?.trim()) return { ok: false, error: "API key required" };
  if (!canEncryptTokens()) return { ok: false, error: "MARKETING_TOKEN_SECRET غير مُعدّ على الخادم" };

  switch (providerKey) {
    case "OPENAI":
    case "OPENAI_IMAGES":
    case "OPENAI_AUDIO":
    case "OPENAI_VIDEO":
      return testOpenAiKey(apiKey);
    case "CLAUDE":
      return testAnthropicKey(apiKey);
    case "GEMINI":
    case "GOOGLE_IMAGEN":
    case "GOOGLE_TTS":
    case "GOOGLE_VEO":
      return testGeminiKey(apiKey);
    case "CUSTOM_OPENAI":
    case "CUSTOM_IMAGE":
    case "CUSTOM_VIDEO":
    case "CUSTOM_AUDIO":
      if (!endpointUrl) return { ok: false, error: "Endpoint URL required" };
      try {
        const res = await fetch(endpointUrl.replace(/\/$/, "") + "/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(15000),
        });
        return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
      }
    default:
      if (process.env[`${providerKey}_API_KEY`] || process.env[`${providerKey.replace(/_/g, "")}_API_KEY`]) {
        return { ok: true };
      }
      return {
        ok: false,
        error: "يتطلب إعداد حساب المطور — لا يمكن التحقق بدون credentials رسمية",
      };
  }
}

export function encryptApiKey(plain: string): string {
  return encryptToken(plain);
}

export function decryptApiKey(enc: string): string {
  return decryptToken(enc);
}
