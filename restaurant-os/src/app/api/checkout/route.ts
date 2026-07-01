import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processRestaurantPayment } from "@/lib/payments";
import { MOYASAR_PAYMENT_METHODS } from "@/lib/moyasar";
import { TAP_PAYMENT_METHODS } from "@/lib/tap";
import { STRIPE_PAYMENT_METHODS } from "@/lib/stripe";
import { PaymentMethodType } from "@prisma/client";
import { checkFeature } from "@/lib/subscription-limits";
import {
  resolveMoyasarPublishableKey,
  sanitizePaymentKey,
} from "@/lib/payment-keys";

export const dynamic = "force-dynamic";

function effectivePrice(item: { price: unknown; discountPrice: unknown | null }) {
  const price = Number(item.price);
  const discount = item.discountPrice != null ? Number(item.discountPrice) : null;
  if (discount != null && discount > 0 && discount < price) return discount;
  return price;
}

export async function GET(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get("tableId");
  if (!tableId) {
    return NextResponse.json({ methods: MOYASAR_PAYMENT_METHODS });
  }

  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
    include: {
      branch: {
        include: {
          restaurant: {
            select: {
              defaultPaymentProvider: true,
              moyasarPublishableKey: true,
              tapPublishableKey: true,
              stripePublishableKey: true,
            },
          },
        },
      },
    },
  });

  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const provider = table.branch.restaurant.defaultPaymentProvider;
  const methods =
    provider === "TAP"
      ? TAP_PAYMENT_METHODS
      : provider === "STRIPE"
        ? STRIPE_PAYMENT_METHODS
        : MOYASAR_PAYMENT_METHODS;

  return NextResponse.json({
    provider,
    publishableKey:
      provider === "MOYASAR"
        ? resolveMoyasarPublishableKey() || null
        : provider === "TAP"
          ? sanitizePaymentKey(table.branch.restaurant.tapPublishableKey) || null
          : provider === "STRIPE"
            ? sanitizePaymentKey(table.branch.restaurant.stripePublishableKey) || null
            : null,
    publishableKeyConfigured:
      provider === "MOYASAR"
        ? Boolean(resolveMoyasarPublishableKey())
        : Boolean(
            provider === "TAP"
              ? sanitizePaymentKey(table.branch.restaurant.tapPublishableKey)
              : sanitizePaymentKey(table.branch.restaurant.stripePublishableKey)
          ),
    methods,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    tableId,
    items,
    tip = 0,
    method = "MADA",
    customerPhone,
    customerName,
    notes,
    couponCode,
  } = body;

  if (!tableId || !items?.length) {
    return NextResponse.json({ error: "الطاولة والمنتجات مطلوبة" }, { status: 400 });
  }

  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
    include: {
      branch: {
        include: { restaurant: true },
      },
    },
  });

  if (!table || !table.isActive) {
    return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
  }

  const restaurant = table.branch.restaurant;

  const orderingCheck = await checkFeature(restaurant.id, "onlineOrdering");
  if (!orderingCheck.allowed) {
    return NextResponse.json(
      { error: orderingCheck.message, code: orderingCheck.code },
      { status: 403 }
    );
  }

  const menuItemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, isAvailable: true },
  });

  if (menuItems.length !== items.length) {
    return NextResponse.json({ error: "بعض المنتجات غير متاحة" }, { status: 400 });
  }

  const itemMap = Object.fromEntries(menuItems.map((m) => [m.id, m]));
  let subtotal = 0;
  const orderItemsData = items.map(
    (item: { menuItemId: string; quantity: number }) => {
      const menuItem = itemMap[item.menuItemId];
      const unitPrice = effectivePrice(menuItem);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        nameAr: menuItem.nameAr,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    }
  );

  let discountAmount = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        restaurantId: restaurant.id,
        code: couponCode.toUpperCase(),
        isActive: true,
      },
    });
    if (coupon && (!coupon.minOrder || subtotal >= Number(coupon.minOrder))) {
      if (coupon.type === "PERCENTAGE") {
        discountAmount = subtotal * (Number(coupon.value) / 100);
      } else if (coupon.type === "FIXED") {
        discountAmount = Number(coupon.value);
      } else if (coupon.type === "FREE_ITEM") {
        discountAmount = Number(coupon.value);
      }
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }
  }

  const tipAmount = Number(tip) || 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + tipAmount);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

  let customerId: string | undefined;
  if (customerPhone) {
    let customer = await prisma.customer.findFirst({
      where: { restaurantId: restaurant.id, phone: customerPhone },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          restaurantId: restaurant.id,
          phone: customerPhone,
          name: customerName,
        },
      });
    } else if (customerName && !customer.name) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { name: customerName },
      });
    }
    customerId = customer.id;
  }

  const lastOrder = await prisma.order.findFirst({
    where: { branchId: table.branchId },
    orderBy: { orderNumber: "desc" },
  });
  const orderNumber = (lastOrder?.orderNumber ?? 1000) + 1;

  let paymentResult;
  try {
    paymentResult = await processRestaurantPayment(
      {
        defaultPaymentProvider: restaurant.defaultPaymentProvider,
        moyasarSecretKey: restaurant.moyasarSecretKey,
        tapSecretKey: restaurant.tapSecretKey,
        stripeSecretKey: restaurant.stripeSecretKey,
        currency: restaurant.currency,
        paymentTestMode: restaurant.paymentTestMode,
      },
      {
        amount: totalAmount,
        description: `طلب #${orderNumber} - ${restaurant.nameAr || restaurant.name}`,
        method,
        callbackUrl: `${appUrl}/order-status/pending`,
        metadata: { tableId, orderNumber: String(orderNumber) },
      }
    );
  } catch {
    return NextResponse.json({ error: "فشل الدفع — تحقق من إعدادات الدفع" }, { status: 402 });
  }

  if (paymentResult.status !== "PAID") {
    return NextResponse.json({ error: "لم يتم إتمام الدفع" }, { status: 402 });
  }

  const order = await prisma.order.create({
    data: {
      branchId: table.branchId,
      tableId: table.id,
      customerId,
      orderNumber,
      status: "NEW",
      subtotal,
      tipAmount,
      discountAmount,
      totalAmount,
      couponCode: couponCode?.toUpperCase(),
      notes,
      items: { create: orderItemsData },
      payments: {
        create: {
          amount: totalAmount,
          status: "PAID",
          provider: paymentResult.provider,
          method: paymentResult.method as PaymentMethodType,
          externalId: paymentResult.externalId,
          externalMetadata: paymentResult.metadata,
          processedAt: new Date(),
        },
      },
    },
    include: { items: true, payments: true },
  });

  await prisma.menuItem.updateMany({
    where: { id: { in: menuItemIds } },
    data: { orderCount: { increment: 1 } },
  });

  if (customerId) {
    const points = Math.floor(subtotal / 10);
    if (points > 0) {
      await prisma.loyaltyPoint.create({
        data: {
          customerId,
          points,
          description: `نقاط طلب #${orderNumber}`,
          orderId: order.id,
        },
      });
    }
  }

  return NextResponse.json(
    {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: Number(order.totalAmount),
      paymentStatus: "PAID",
    },
    { status: 201 }
  );
}
