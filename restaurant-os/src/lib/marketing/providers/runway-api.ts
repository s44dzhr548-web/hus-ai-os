/** Runway Dev API — server-side key validation only (no key logging). */

export const RUNWAY_API_VERSION = "2024-11-06";
export const RUNWAY_ORG_URL = "https://api.dev.runwayml.com/v1/organization";

export type RunwayTestResult = {
  ok: boolean;
  error?: string;
  errorCode?: "invalid_key" | "insufficient_credits" | "server" | "network" | "encryption";
  creditBalance?: number;
};

function safeRunwayErrorMessage(status: number, bodyText: string): string {
  if (status === 401 || status === 403) {
    return "مفتاح Runway غير صالح أو لا يملك صلاحية";
  }
  try {
    const j = JSON.parse(bodyText) as { error?: string; message?: string };
    const msg = j.error ?? j.message;
    if (typeof msg === "string" && msg.length > 0 && msg.length < 200) {
      return msg;
    }
  } catch {
    /* ignore */
  }
  if (status >= 500) return "فشل الاتصال بالخادم";
  return `Runway API responded with HTTP ${status}`;
}

export async function testRunwayApiKey(apiKey: string): Promise<RunwayTestResult> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, error: "الحقول المطلوبة ناقصة", errorCode: "invalid_key" };
  }

  try {
    const res = await fetch(RUNWAY_ORG_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": RUNWAY_API_VERSION,
      },
      signal: AbortSignal.timeout(20000),
    });

    const bodyText = await res.text();

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error: "مفتاح Runway غير صالح أو لا يملك صلاحية",
        errorCode: "invalid_key",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: safeRunwayErrorMessage(res.status, bodyText),
        errorCode: res.status >= 500 ? "server" : "invalid_key",
      };
    }

    let creditBalance: number | undefined;
    try {
      const data = JSON.parse(bodyText) as {
        creditBalance?: number;
        credits?: number;
        organization?: { creditBalance?: number };
      };
      creditBalance =
        data.creditBalance ??
        data.credits ??
        data.organization?.creditBalance;
    } catch {
      /* org payload optional */
    }

    if (typeof creditBalance === "number" && creditBalance <= 0) {
      return {
        ok: false,
        error: "رصيد Runway غير كافٍ — أضف رصيدًا من dev.runwayml.com قبل توليد الفيديو",
        errorCode: "insufficient_credits",
        creditBalance,
      };
    }

    return { ok: true, creditBalance };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "فشل الاتصال بالخادم",
      errorCode: "network",
    };
  }
}
