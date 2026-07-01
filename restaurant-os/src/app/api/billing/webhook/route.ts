import { NextRequest, NextResponse } from "next/server";
import {
  logBillingEvent,
  processMoyasarPaymentId,
  verifyWebhookPayload,
} from "@/lib/billing/subscription-billing";

export const dynamic = "force-dynamic";

type WebhookPayload = {
  id?: string;
  type?: string;
  secret_token?: string;
  data?: {
    id?: string;
    status?: string;
    metadata?: { billingPaymentId?: string };
  };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-moyasar-signature") ||
    req.headers.get("X-Moyasar-Signature");

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifyWebhookPayload(payload, { rawBody, signatureHeader: signature })) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const eventType = payload.type || "";
  const paymentId = payload.data?.id;
  const billingPaymentId = payload.data?.metadata?.billingPaymentId;

  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  if (eventType === "payment_failed" || eventType === "payment_faild") {
    await logBillingEvent({
      restaurantId: "webhook",
      action: "BILLING_PAYMENT_FAILED",
      entityId: paymentId,
      metadata: { type: eventType },
    });
    return NextResponse.json({ received: true, processed: false });
  }

  if (eventType !== "payment_paid" && payload.data?.status !== "paid") {
    return NextResponse.json({ received: true, skipped: eventType });
  }

  const result = await processMoyasarPaymentId(paymentId, billingPaymentId);

  if (!result.ok && !result.error?.includes("Duplicate")) {
    await logBillingEvent({
      restaurantId: "webhook",
      action: "BILLING_WEBHOOK_FAILED",
      entityId: paymentId,
      metadata: { error: result.error, type: eventType },
    });
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  await logBillingEvent({
    restaurantId:
      (result.ok && "billing" in result && result.billing?.restaurantId) || "webhook",
    action: "BILLING_WEBHOOK_PROCESSED",
    entityId:
      (result.ok && "billing" in result && result.billing?.id) || paymentId,
    metadata: {
      duplicate: result.ok && "duplicate" in result ? Boolean(result.duplicate) : false,
      paymentId,
      type: eventType,
    },
  });

  return NextResponse.json({ received: true, activated: true });
}
