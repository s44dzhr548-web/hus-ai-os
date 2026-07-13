import { buildTemplateVariables } from "./template";

export type WhatsAppSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; retryable: boolean };

export async function sendWhatsAppTemplateMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  toPhone: string;
  templateName: string;
  languageCode: string;
  customerName: string;
  restaurantName: string;
  tableNumber: string;
  reviewUrl: string;
  messageBody?: string | null;
}): Promise<WhatsAppSendResult> {
  const { bodyParams } = buildTemplateVariables({
    customerName: params.customerName,
    restaurantName: params.restaurantName,
    tableNumber: params.tableNumber,
    reviewUrl: params.reviewUrl,
    messageBody: params.messageBody,
  });

  let urlButtonSuffix = params.reviewUrl;
  try {
    const parsed = new URL(params.reviewUrl);
    urlButtonSuffix = `${parsed.pathname.replace(/^\//, "")}${parsed.search}`;
  } catch {
    /* use full URL as fallback */
  }

  const url = `https://graph.facebook.com/v21.0/${params.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: params.toPhone,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode },
      components: [
        {
          type: "body",
          parameters: bodyParams,
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: urlButtonSuffix }],
        },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string; code?: number };
    };

    if (!res.ok) {
      const msg = data.error?.message || `HTTP ${res.status}`;
      const retryable = res.status >= 500 || res.status === 429;
      return { ok: false, error: msg, retryable };
    }

    const messageId = data.messages?.[0]?.id;
    if (!messageId) {
      return { ok: false, error: "No message id returned", retryable: false };
    }
    return { ok: true, messageId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
      retryable: true,
    };
  }
}
