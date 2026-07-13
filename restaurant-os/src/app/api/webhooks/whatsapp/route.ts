import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveMetaCredentials } from "@/lib/platform/meta-config";

export const dynamic = "force-dynamic";

/** Meta WhatsApp Cloud API webhook — delivery status updates */
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
    const body = await req.json();
    const entries = body.entry as Array<{
      changes?: Array<{
        value?: {
          statuses?: Array<{
            id: string;
            status: string;
            timestamp?: string;
            errors?: Array<{ title?: string; message?: string }>;
          }>;
          messages?: Array<{
            type?: string;
            button?: { text?: string; payload?: string };
          }>;
        };
      }>;
    }>;

    for (const entry of entries || []) {
      for (const change of entry.changes || []) {
        const statuses = change.value?.statuses || [];
        for (const st of statuses) {
          const delivery = await prisma.whatsAppMessageDelivery.findFirst({
            where: { providerMessageId: st.id },
          });
          if (!delivery) continue;

          const ts = st.timestamp ? new Date(parseInt(st.timestamp, 10) * 1000) : new Date();
          if (st.status === "delivered") {
            await prisma.whatsAppMessageDelivery.update({
              where: { id: delivery.id },
              data: { status: "DELIVERED", deliveredAt: ts },
            });
          } else if (st.status === "read") {
            await prisma.whatsAppMessageDelivery.update({
              where: { id: delivery.id },
              data: { status: "READ", readAt: ts },
            });
          } else if (st.status === "failed") {
            const reason = st.errors?.[0]?.message || st.errors?.[0]?.title || "Delivery failed";
            await prisma.whatsAppMessageDelivery.update({
              where: { id: delivery.id },
              data: { status: "FAILED", failedReason: reason },
            });
          }
        }

        const messages = change.value?.messages || [];
        for (const msg of messages) {
          const text =
            msg.button?.text ||
            msg.button?.payload ||
            (msg as { text?: { body?: string } }).text?.body ||
            "";
          const isOptOut =
            /إلغاء\s*الاشتراك|unsubscribe|opt.?out|stop/i.test(text) ||
            msg.button?.payload === "OPT_OUT";
          if (!isOptOut) continue;

          const fromPhone = (msg as { from?: string }).from;
          if (!fromPhone) continue;

          const profile = await prisma.customerProfile.findFirst({
            where: { customerPhone: { contains: fromPhone.slice(-9) } },
            orderBy: { updatedAt: "desc" },
          });
          if (profile) {
            await prisma.customerProfile.update({
              where: { id: profile.id },
              data: { marketingConsent: false, marketingConsentAt: null },
            });
          }

          const pending = await prisma.whatsAppMessageDelivery.findMany({
            where: {
              phone: { contains: fromPhone.slice(-9) },
              status: { in: ["QUEUED", "SENT"] },
            },
          });
          for (const d of pending) {
            await prisma.whatsAppMessageDelivery.update({
              where: { id: d.id },
              data: { status: "OPTED_OUT", failedReason: "Customer opted out via WhatsApp" },
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[whatsapp webhook]", e);
    return NextResponse.json({ received: true });
  }
}
