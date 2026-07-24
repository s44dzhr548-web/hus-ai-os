import { sanitizeAccessToken, WHATSAPP_GRAPH } from "@/lib/marketing/whatsapp-graph-api";

export type WhatsAppOutboundResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; retryable: boolean };

async function postMessages(
  phoneNumberId: string,
  accessToken: string,
  payload: object
): Promise<WhatsAppOutboundResult> {
  const token = sanitizeAccessToken(accessToken);
  if (!token) {
    return { ok: false, error: "WhatsApp Access Token is required", retryable: false };
  }

  const res = await fetch(`${WHATSAPP_GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = data.error?.message || `HTTP ${res.status}`;
    return { ok: false, error: msg, retryable: res.status >= 500 || res.status === 429 };
  }

  const messageId = data.messages?.[0]?.id;
  if (!messageId) return { ok: false, error: "No message id returned", retryable: false };
  return { ok: true, messageId };
}

/** Outbound send — always uses Phone Number ID path only. */
export async function sendWhatsAppTextMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  toWaId: string;
  text: string;
}): Promise<WhatsAppOutboundResult> {
  return postMessages(params.phoneNumberId, params.accessToken, {
    recipient_type: "individual",
    to: params.toWaId.replace(/\D/g, ""),
    type: "text",
    text: { body: params.text },
  });
}

export async function sendWhatsAppTemplateMessageSimple(params: {
  phoneNumberId: string;
  accessToken: string;
  toWaId: string;
  templateName: string;
  languageCode: string;
  bodyParameters?: string[];
}): Promise<WhatsAppOutboundResult> {
  const components =
    params.bodyParameters?.length ?
      [
        {
          type: "body",
          parameters: params.bodyParameters.map((text) => ({ type: "text", text })),
        },
      ]
    : undefined;

  return postMessages(params.phoneNumberId, params.accessToken, {
    recipient_type: "individual",
    to: params.toWaId.replace(/\D/g, ""),
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode },
      ...(components ? { components } : {}),
    },
  });
}

export async function sendWhatsAppMediaMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  toWaId: string;
  type: "image" | "document" | "audio" | "video";
  mediaId: string;
  caption?: string;
  filename?: string;
}): Promise<WhatsAppOutboundResult> {
  const mediaKey = params.type;
  const mediaPayload: Record<string, string> = { id: params.mediaId };
  if (params.caption && params.type !== "audio") mediaPayload.caption = params.caption;
  if (params.filename && params.type === "document") mediaPayload.filename = params.filename;

  return postMessages(params.phoneNumberId, params.accessToken, {
    recipient_type: "individual",
    to: params.toWaId.replace(/\D/g, ""),
    type: params.type,
    [mediaKey]: mediaPayload,
  });
}

export async function uploadWhatsAppMedia(params: {
  phoneNumberId: string;
  accessToken: string;
  file: Blob;
  mimeType: string;
  filename?: string;
}): Promise<{ ok: true; mediaId: string } | { ok: false; error: string }> {
  const token = sanitizeAccessToken(params.accessToken);
  if (!token) return { ok: false, error: "WhatsApp Access Token is required" };

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", params.mimeType);
  form.append("file", params.file, params.filename || "upload");

  const res = await fetch(`${WHATSAPP_GRAPH}/${params.phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!res.ok || !data.id) {
    return { ok: false, error: data.error?.message || `Upload failed (${res.status})` };
  }
  return { ok: true, mediaId: data.id };
}
