import { decryptToken, canEncryptTokens } from "@/lib/marketing/encryption";
import { resolveMetaCredentials } from "@/lib/platform/meta-config";

const WHATSAPP_GRAPH = "https://graph.facebook.com/v23.0";

/** Platform WhatsApp Cloud API token — DB (encrypted) then env fallback. */
export async function resolveWhatsAppAccessToken(): Promise<string | null> {
  const creds = await resolveMetaCredentials();
  return creds.whatsappAccessToken;
}

export async function testWhatsAppAccessToken(
  accessToken: string
): Promise<{ ok: boolean; message: string; name?: string; id?: string }> {
  if (!accessToken.trim()) {
    return { ok: false, message: "WhatsApp Access Token is required" };
  }

  try {
    const url = `${WHATSAPP_GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(accessToken.trim())}`;
    const res = await fetch(url, { method: "GET" });
    const data = (await res.json()) as {
      id?: string;
      name?: string;
      error?: { message?: string };
    };

    if (!res.ok || data.error) {
      return { ok: false, message: data.error?.message || `HTTP ${res.status}` };
    }

    return {
      ok: true,
      message: "WhatsApp connection successful",
      name: data.name,
      id: data.id,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Connection failed",
    };
  }
}
