import crypto from "crypto";
import prisma from "@/lib/prisma";
import {
  BillingPaymentStatus,
  BillingPaymentType,
  PaymentMethodType,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import {
  verifyMoyasarPayment,
  mapMoyasarMethod,
  createMoyasarPayment,
  type MoyasarPaymentResponse,
} from "@/lib/moyasar";
import {
  BILLING_CYCLE_DAYS,
  normalizePlan,
  planPrice,
  TRIAL_DAYS,
} from "@/lib/subscription-limits";
import { logAudit } from "@/lib/audit";
import {
  appBaseUrl,
  getPlatformMoyasarKeys,
  isLiveBilling,
  isMockBilling,
} from "@/lib/billing/gateway";


export { getPlatformMoyasarKeys, isMockBilling, appBaseUrl } from "@/lib/billing/gateway";

export async function generateInvoiceNumber(): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  for (let i = 0; i < 5; i++) {
    const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
    const num = `INV-${date}-${suffix}`;
    const exists = await prisma.subscriptionBillingPayment.findUnique({
      where: { invoiceNumber: num },
    });
    if (!exists) return num;
  }
  return `INV-${date}-${Date.now()}`;
}

export function amountInHalalas(sar: number): number {
  return Math.round(sar * 100);
}

export function billingPeriodEnd(from = new Date()): Date {
  return new Date(from.getTime() + BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000);
}

export function resolveBillingType(
  currentPlan: SubscriptionPlan,
  targetPlan: SubscriptionPlan
): BillingPaymentType {
  const current = normalizePlan(currentPlan);
  const target = normalizePlan(targetPlan);
  if (current === "FREE" || current === target) return "RENEWAL";
  return "UPGRADE";
}

export async function createPendingBillingPayment(opts: {
  restaurantId: string;
  subscriptionId: string;
  plan: SubscriptionPlan;
  type: BillingPaymentType;
  amount: number;
}) {
  const invoiceNumber = await generateInvoiceNumber();
  return prisma.subscriptionBillingPayment.create({
    data: {
      restaurantId: opts.restaurantId,
      subscriptionId: opts.subscriptionId,
      plan: normalizePlan(opts.plan),
      type: opts.type,
      amount: opts.amount,
      currency: "SAR",
      status: "PENDING",
      invoiceNumber,
      metadata: { createdAt: new Date().toISOString() },
    },
  });
}

export async function logBillingEvent(params: {
  restaurantId: string;
  userId?: string;
  action: string;
  entityId?: string;
  metadata?: object;
}) {
  await logAudit({
    userId: params.userId,
    restaurantId: params.restaurantId,
    action: params.action,
    entity: "SubscriptionBillingPayment",
    entityId: params.entityId,
    metadata: { domain: "billing", ...params.metadata },
  });
}

export async function activateSubscriptionFromPayment(
  billingPaymentId: string,
  moyasarPayment: MoyasarPaymentResponse,
  userId?: string
) {
  const billing = await prisma.subscriptionBillingPayment.findUnique({
    where: { id: billingPaymentId },
    include: { subscription: true },
  });

  if (!billing) {
    return { ok: false as const, error: "Billing payment not found" };
  }

  if (billing.status === "PAID") {
    return { ok: true as const, duplicate: true, billing };
  }

  if (billing.moyasarPaymentId && billing.moyasarPaymentId !== moyasarPayment.id) {
    return { ok: false as const, error: "Payment ID mismatch" };
  }

  const existingByMoyasar = await prisma.subscriptionBillingPayment.findUnique({
    where: { moyasarPaymentId: moyasarPayment.id },
  });
  if (existingByMoyasar && existingByMoyasar.id !== billing.id) {
    return { ok: false as const, error: "Duplicate Moyasar payment" };
  }

  const now = new Date();
  const periodStart = now;
  const periodEnd = billingPeriodEnd(now);
  const method = mapMoyasarMethod(
    moyasarPayment.source?.type || "visa",
    (moyasarPayment.source as { company?: string })?.company
  ) as PaymentMethodType;

  const token =
    (moyasarPayment as { source?: { token?: string } }).source?.token || null;

  const [updatedBilling, subscription] = await prisma.$transaction([
    prisma.subscriptionBillingPayment.update({
      where: { id: billing.id },
      data: {
        status: "PAID" as BillingPaymentStatus,
        moyasarPaymentId: moyasarPayment.id,
        paymentMethod: method,
        periodStart,
        periodEnd,
        processedAt: now,
        metadata: {
          ...(typeof billing.metadata === "object" && billing.metadata
            ? billing.metadata
            : {}),
          moyasarStatus: moyasarPayment.status,
          moyasarAmount: moyasarPayment.amount,
        },
      },
    }),
    prisma.subscription.update({
      where: { restaurantId: billing.restaurantId },
      data: {
        plan: normalizePlan(billing.plan),
        status: "ACTIVE" as SubscriptionStatus,
        startDate: periodStart,
        endDate: periodEnd,
        autoRenew: true,
        ...(token ? { moyasarToken: token } : {}),
      },
    }),
  ]);

  await logBillingEvent({
    restaurantId: billing.restaurantId,
    userId,
    action: "BILLING_PAYMENT_SUCCEEDED",
    entityId: updatedBilling.id,
    metadata: {
      plan: billing.plan,
      amount: Number(billing.amount),
      moyasarPaymentId: moyasarPayment.id,
      invoiceNumber: billing.invoiceNumber,
    },
  });

  return { ok: true as const, billing: updatedBilling, subscription };
}

export async function processMoyasarPaymentId(
  moyasarPaymentId: string,
  billingPaymentId?: string,
  userId?: string
) {
  if (isLiveBilling() && moyasarPaymentId.startsWith("mock_")) {
    return { ok: false as const, error: "Mock payments rejected in live mode" };
  }

  const moyasarPayment = await verifyMoyasarPayment(
    moyasarPaymentId,
    getPlatformMoyasarKeys().secretKey
  );

  if (!moyasarPayment) {
    return { ok: false as const, error: "Unable to verify payment" };
  }

  if (moyasarPayment.status !== "paid") {
    return { ok: false as const, error: `Payment status: ${moyasarPayment.status}` };
  }

  let billingId = billingPaymentId;

  if (!billingId) {
    const byMoyasar = await prisma.subscriptionBillingPayment.findUnique({
      where: { moyasarPaymentId },
    });
    if (byMoyasar) billingId = byMoyasar.id;
  }

  if (!billingId) {
    const metaBillingId =
      (moyasarPayment as { metadata?: { billingPaymentId?: string } }).metadata
        ?.billingPaymentId;
    if (metaBillingId) billingId = metaBillingId;
  }

  if (!billingId) {
    return { ok: false as const, error: "Billing record not found" };
  }

  // Verify amount matches invoice in live mode
  if (isLiveBilling()) {
    const pending = await prisma.subscriptionBillingPayment.findUnique({
      where: { id: billingId },
    });
    if (pending && moyasarPayment.amount !== amountInHalalas(Number(pending.amount))) {
      return { ok: false as const, error: "Payment amount mismatch" };
    }
  }

  return activateSubscriptionFromPayment(billingId, moyasarPayment, userId);
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return a === b;
  }
}

function verifyWebhookHmac(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.replace(/^sha256=/i, "").trim();
  return secureCompare(expected, received);
}

export function verifyWebhookPayload(
  payload: { secret_token?: string },
  opts?: { rawBody?: string; signatureHeader?: string | null }
): boolean {
  const { webhookSecret } = getPlatformMoyasarKeys();

  if (!webhookSecret) {
    return isMockBilling();
  }

  // Moyasar official: secret_token in webhook JSON body
  if (payload.secret_token) {
    return secureCompare(payload.secret_token, webhookSecret);
  }

  // HMAC header (x-moyasar-signature over raw JSON body)
  if (opts?.signatureHeader && opts?.rawBody) {
    return verifyWebhookHmac(opts.rawBody, opts.signatureHeader, webhookSecret);
  }

  return false;
}

/** @deprecated use verifyWebhookPayload */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  return verifyWebhookPayload(
    {},
    { rawBody, signatureHeader }
  );
}

export async function expireDueSubscriptions() {
  const now = new Date();
  const due = await prisma.subscription.findMany({
    where: {
      endDate: { lt: now },
      status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] },
    },
    include: { restaurant: { select: { id: true, name: true } } },
  });

  let expired = 0;
  for (const sub of due) {
    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      }),
    ]);
    await logBillingEvent({
      restaurantId: sub.restaurantId,
      action: "SUBSCRIPTION_SUSPENDED",
      entityId: sub.id,
      metadata: {
        plan: sub.plan,
        endDate: sub.endDate?.toISOString(),
        reason: "subscription_expired",
      },
    });
    expired++;
  }
  return expired;
}

export async function markPastDueSubscriptions() {
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const subs = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      autoRenew: true,
      endDate: { lte: soon, gte: now },
      moyasarToken: { not: null },
    },
  });

  let renewed = 0;
  for (const sub of subs) {
    const plan = normalizePlan(sub.plan);
    const price = planPrice(plan);
    if (price <= 0) continue;

    try {
      const invoiceNumber = await generateInvoiceNumber();
      const pending = await prisma.subscriptionBillingPayment.create({
        data: {
          restaurantId: sub.restaurantId,
          subscriptionId: sub.id,
          plan,
          type: "RENEWAL",
          amount: price,
          invoiceNumber,
          status: "PENDING",
          metadata: { autoRenew: true },
        },
      });

      const payment = await createMoyasarPayment(
        {
          amount: amountInHalalas(price),
          currency: "SAR",
          description: `Menu OS ${plan} renewal`,
          callback_url: `${appBaseUrl()}/api/billing/callback?billingId=${pending.id}`,
          source: { type: "token", token: sub.moyasarToken! },
          metadata: {
            billingPaymentId: pending.id,
            restaurantId: sub.restaurantId,
            plan,
          },
        },
        getPlatformMoyasarKeys().secretKey
      );

      if (payment.status === "paid") {
        await processMoyasarPaymentId(payment.id, pending.id);
        renewed++;
      } else {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "PAST_DUE" },
        });
      }
    } catch {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "PAST_DUE" },
      });
    }
  }
  return renewed;
}

export async function startTrialSubscription(restaurantId: string) {
  const endDate = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return prisma.subscription.upsert({
    where: { restaurantId },
    update: {},
    create: {
      restaurantId,
      plan: "FREE",
      status: "TRIAL",
      startDate: new Date(),
      endDate,
      autoRenew: false,
    },
  });
}

export async function computeBillingStats() {
  const [restaurants, paidPayments, subscriptions] = await Promise.all([
    prisma.restaurant.count(),
    prisma.subscriptionBillingPayment.findMany({
      where: { status: "PAID" },
      select: { amount: true, processedAt: true, plan: true },
    }),
    prisma.subscription.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const active = subscriptions.find((s) => s.status === "ACTIVE")?._count ?? 0;
  const trial = subscriptions.find((s) => s.status === "TRIAL")?._count ?? 0;
  const expired = subscriptions.find((s) => s.status === "EXPIRED")?._count ?? 0;
  const pastDue = subscriptions.find((s) => s.status === "PAST_DUE")?._count ?? 0;

  const activeSubs = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    select: { plan: true },
  });

  const mrr = activeSubs.reduce((sum, s) => sum + planPrice(normalizePlan(s.plan)), 0);
  const arr = mrr * 12;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyRevenue = paidPayments
    .filter((p) => p.processedAt && p.processedAt >= monthStart)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    totalCustomers: restaurants,
    activeSubscriptions: active,
    trialAccounts: trial,
    expiredAccounts: expired,
    pastDueAccounts: pastDue,
    mrr,
    arr,
    monthlyRevenue,
    totalRevenue: paidPayments.reduce((sum, p) => sum + Number(p.amount), 0),
  };
}
