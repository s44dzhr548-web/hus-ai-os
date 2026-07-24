import { NextRequest, NextResponse } from "next/server";
import { resolveMetaCredentials } from "@/lib/platform/meta-config";
import { resolveWhatsAppAccessToken } from "@/lib/platform/whatsapp-access-token";
import { verifyMetaWebhookSignature } from "@/lib/whatsapp-inbox/signature";
import { processWhatsAppWebhookPayload } from "@/lib/whatsapp-inbox/webhook";

export const dynamic = "force-dynamic";

/** Meta WhatsApp Cloud API webhook — verify + inbound messages + delivery status */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const { webhookVerifyToken } = await resolveMetaCredentials();

  if (mode === "subscribe" && token && webhookVerifyToken && token === webhookVerifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const creds = await resolveMetaCredentials();
    const signature = req.headers.get("x-hub-signature-256");

    if (creds.clientSecret) {
      const valid = verifyMetaWebhookSignature(rawBody, signature, creds.clientSecret);
      if (!valid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody) as unknown;
    const platformToken = await resolveWhatsAppAccessToken();
    await processWhatsAppWebhookPayload(body, platformToken);

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[whatsapp webhook]", e instanceof Error ? e.message : e);
    return NextResponse.json({ received: true });
  }
}
