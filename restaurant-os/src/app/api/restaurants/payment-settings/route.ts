import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import {
  maskSecretKey,
  moyasarKeysConfigured,
  resolveMoyasarPublishableKey,
  sanitizePaymentKey,
} from "@/lib/payment-keys";

export const dynamic = "force-dynamic";

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId! },
    select: {
      defaultPaymentProvider: true,
      moyasarPublishableKey: true,
      tapPublishableKey: true,
      stripePublishableKey: true,
      moyasarSecretKey: true,
      tapSecretKey: true,
      stripeSecretKey: true,
      paymentTestMode: true,
      whatsappNumber: true,
    },
  });

  const provider = restaurant?.defaultPaymentProvider || "MOYASAR";
  const moyasarFromEnv = resolveMoyasarPublishableKey();
  const moyasarConfigured = moyasarKeysConfigured();

  return NextResponse.json({
    defaultPaymentProvider: provider,
    // Moyasar: always from platform env — never expose DB placeholders
    moyasarPublishableKey:
      provider === "MOYASAR"
        ? moyasarFromEnv || ""
        : sanitizePaymentKey(restaurant?.moyasarPublishableKey),
    moyasarSecretKey:
      provider === "MOYASAR"
        ? moyasarConfigured
          ? "••••••••"
          : ""
        : maskSecretKey(restaurant?.moyasarSecretKey),
    moyasarKeySource: provider === "MOYASAR" ? "environment" : "restaurant",
    moyasarConfigured,
    tapPublishableKey: sanitizePaymentKey(restaurant?.tapPublishableKey),
    tapSecretKey: maskSecretKey(restaurant?.tapSecretKey),
    stripePublishableKey: sanitizePaymentKey(restaurant?.stripePublishableKey),
    stripeSecretKey: maskSecretKey(restaurant?.stripeSecretKey),
    paymentTestMode: restaurant?.paymentTestMode ?? false,
    whatsappNumber: restaurant?.whatsappNumber,
  });
}

export async function PUT(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const existing = await prisma.restaurant.findUnique({
    where: { id: restaurantId! },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const provider = body.defaultPaymentProvider || existing.defaultPaymentProvider;

  // Moyasar keys come from env — do not persist per-restaurant Moyasar keys
  const touchesPayments =
    body.defaultPaymentProvider ||
    (provider !== "MOYASAR" && body.moyasarPublishableKey !== undefined) ||
    body.tapPublishableKey !== undefined ||
    body.stripePublishableKey !== undefined ||
    (provider !== "MOYASAR" &&
      body.moyasarSecretKey &&
      !body.moyasarSecretKey.includes("••••")) ||
    (body.tapSecretKey && !body.tapSecretKey.includes("••••")) ||
    (body.stripeSecretKey && !body.stripeSecretKey.includes("••••"));

  if (touchesPayments) {
    const paymentsCheck = await assertFeature(restaurantId!, "payments");
    if (paymentsCheck) return paymentsCheck;
  }

  if (body.whatsappNumber !== undefined) {
    const whatsappCheck = await assertFeature(restaurantId!, "whatsapp");
    if (whatsappCheck) return whatsappCheck;
  }

  const data: Record<string, unknown> = {};
  if (body.defaultPaymentProvider) data.defaultPaymentProvider = body.defaultPaymentProvider;

  if (provider === "MOYASAR") {
    data.moyasarPublishableKey = null;
    data.moyasarSecretKey = null;
  } else {
    if (body.moyasarPublishableKey !== undefined) {
      data.moyasarPublishableKey = sanitizePaymentKey(body.moyasarPublishableKey) || null;
    }
    if (body.moyasarSecretKey && !body.moyasarSecretKey.includes("••••")) {
      data.moyasarSecretKey = sanitizePaymentKey(body.moyasarSecretKey) || null;
    }
  }

  if (body.tapPublishableKey !== undefined) {
    data.tapPublishableKey = sanitizePaymentKey(body.tapPublishableKey) || null;
  }
  if (body.tapSecretKey && !body.tapSecretKey.includes("••••")) {
    data.tapSecretKey = sanitizePaymentKey(body.tapSecretKey) || null;
  }
  if (body.stripePublishableKey !== undefined) {
    data.stripePublishableKey = sanitizePaymentKey(body.stripePublishableKey) || null;
  }
  if (body.stripeSecretKey && !body.stripeSecretKey.includes("••••")) {
    data.stripeSecretKey = sanitizePaymentKey(body.stripeSecretKey) || null;
  }
  if (body.paymentTestMode !== undefined) data.paymentTestMode = Boolean(body.paymentTestMode);
  if (body.whatsappNumber !== undefined) data.whatsappNumber = body.whatsappNumber;

  const updated = await prisma.restaurant.update({
    where: { id: restaurantId! },
    data,
  });

  return NextResponse.json({ success: true, provider: updated.defaultPaymentProvider });
}
