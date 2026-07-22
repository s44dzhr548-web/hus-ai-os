import { resolveMetaCredentials } from "@/lib/platform/meta-config";
import { graphGet, sanitizeAccessToken } from "@/lib/marketing/whatsapp-graph-api";

/** Platform WhatsApp Cloud API token — DB (encrypted) then env fallback. */
export async function resolveWhatsAppAccessToken(): Promise<string | null> {
  const creds = await resolveMetaCredentials();
  return sanitizeAccessToken(creds.whatsappAccessToken);
}

export async function testWhatsAppAccessToken(
  accessToken: string
): Promise<{ ok: boolean; message: string; name?: string; id?: string }> {
  const token = sanitizeAccessToken(accessToken);
  if (!token) {
    return { ok: false, message: "WhatsApp Access Token is required" };
  }

  try {
    const data = await graphGet<{ id?: string; name?: string }>("/me", token, {
      fields: "id,name",
    });
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
