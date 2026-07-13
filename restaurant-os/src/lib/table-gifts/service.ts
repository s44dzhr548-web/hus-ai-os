import type { TableGiftStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getActiveSessionForTable } from "@/lib/reception";
import { processRestaurantPayment } from "@/lib/payments";
import { PaymentMethodType } from "@prisma/client";
import {
  DEFAULT_TABLE_GIFT_SETTINGS,
  parseTableGiftSettings,
  type TableGiftSettings,
} from "./types";

function effectivePrice(item: { price: unknown; discountPrice: unknown | null }) {
  const price = Number(item.price);
  const discount = item.discountPrice != null ? Number(item.discountPrice) : null;
  if (discount != null && discount > 0 && discount < price) return discount;
  return price;
}

export async function getGiftSettings(restaurantId: string): Promise<TableGiftSettings> {
  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { tableGiftsEnabled: true, tableGiftsSettingsJson: true },
  });
  if (!r) return DEFAULT_TABLE_GIFT_SETTINGS;
  return parseTableGiftSettings(r.tableGiftsEnabled, r.tableGiftsSettingsJson);
}

export async function assertGiftsEnabled(restaurantId: string) {
  const settings = await getGiftSettings(restaurantId);
  if (!settings.enabled) {
    throw new Error("ميزة الإهداء غير مفعّلة");
  }
  return settings;
}

export async function expireStaleGifts(restaurantId?: string) {
  const now = new Date();
  await prisma.tableGift.updateMany({
    where: {
      ...(restaurantId ? { restaurantId } : {}),
      status: "PENDING_ACCEPTANCE",
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED", expiredAt: now },
  });
}

export async function listGiftableTables(senderTableId: string) {
  const table = await prisma.diningTable.findUnique({
    where: { id: senderTableId, isActive: true },
    include: { branch: { select: { restaurantId: true, id: true } } },
  });
  if (!table) throw new Error("الطاولة غير موجودة");

  await assertGiftsEnabled(table.branch.restaurantId);
  await expireStaleGifts(table.branch.restaurantId);

  const sessions = await prisma.tableSession.findMany({
    where: {
      branchId: table.branchId,
      endedAt: null,
      status: { not: "COMPLETED" },
      tableId: { not: senderTableId },
    },
    include: {
      table: { select: { id: true, number: true, label: true } },
    },
    orderBy: { tableNumber: "asc" },
  });

  return sessions.map((s) => ({
    tableId: s.tableId,
    tableNumber: s.tableDisplayNumber ?? String(s.tableNumber),
    tableLabel: s.tableLabel ?? s.table?.label ?? null,
    guestCount: s.guestCount,
    status: s.status,
  }));
}

export function serializeGift(g: {
  id: string;
  status: TableGiftStatus;
  paymentStatus: string;
  productName: string;
  productImageUrl?: string | null;
  quantity: number;
  unitPrice: unknown;
  totalAmount: unknown;
  giftMessage?: string | null;
  senderDisplayName?: string | null;
  isAnonymous: boolean;
  senderTableNumber: string;
  receiverTableNumber: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  paidAt?: Date | null;
  deliveredAt?: Date | null;
  createdAt: Date;
  orderId?: string | null;
}) {
  return {
    id: g.id,
    status: g.status,
    paymentStatus: g.paymentStatus,
    productName: g.productName,
    productImageUrl: g.productImageUrl ?? null,
    quantity: g.quantity,
    unitPrice: Number(g.unitPrice),
    totalAmount: Number(g.totalAmount),
    giftMessage: g.giftMessage ?? null,
    senderDisplayName: g.isAnonymous ? null : g.senderDisplayName ?? null,
    isAnonymous: g.isAnonymous,
    senderTableNumber: g.senderTableNumber,
    receiverTableNumber: g.receiverTableNumber,
    expiresAt: g.expiresAt.toISOString(),
    acceptedAt: g.acceptedAt?.toISOString() ?? null,
    rejectedAt: g.rejectedAt?.toISOString() ?? null,
    paidAt: g.paidAt?.toISOString() ?? null,
    deliveredAt: g.deliveredAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
    orderId: g.orderId ?? null,
  };
}

export async function createGift(params: {
  senderTableId: string;
  receiverTableId: string;
  productId: string;
  quantity?: number;
  giftMessage?: string | null;
  senderDisplayName?: string | null;
  isAnonymous?: boolean;
}) {
  const senderTable = await prisma.diningTable.findUnique({
    where: { id: params.senderTableId, isActive: true },
    include: { branch: { include: { restaurant: true } } },
  });
  if (!senderTable) throw new Error("طاولة المرسل غير موجودة");

  await assertGiftsEnabled(senderTable.branch.restaurantId);
  await expireStaleGifts(senderTable.branch.restaurantId);

  if (params.receiverTableId === params.senderTableId) {
    throw new Error("لا يمكن الإهداء لنفس الطاولة");
  }

  const receiverTable = await prisma.diningTable.findFirst({
    where: {
      id: params.receiverTableId,
      branchId: senderTable.branchId,
      isActive: true,
    },
  });
  if (!receiverTable) throw new Error("طاولة المستلم غير موجودة");

  const senderSession = await getActiveSessionForTable(params.senderTableId);
  const receiverSession = await getActiveSessionForTable(params.receiverTableId);
  if (!senderSession) throw new Error("لا توجد جلسة نشطة على طاولتك");
  if (!receiverSession) throw new Error("الطاولة المستهدفة غير نشطة");

  const product = await prisma.menuItem.findFirst({
    where: {
      id: params.productId,
      isAvailable: true,
      category: { restaurantId: senderTable.branch.restaurantId },
    },
  });
  if (!product) throw new Error("المنتج غير متاح");

  const settings = await getGiftSettings(senderTable.branch.restaurantId);
  const qty = Math.max(1, Math.min(20, params.quantity ?? 1));
  const unitPrice = effectivePrice(product);
  const totalAmount = unitPrice * qty;
  const timeoutMs = settings.acceptanceTimeoutMinutes * 60 * 1000;

  const gift = await prisma.tableGift.create({
    data: {
      restaurantId: senderTable.branch.restaurantId,
      branchId: senderTable.branchId,
      senderSessionId: senderSession.id,
      senderTableId: params.senderTableId,
      senderTableNumber:
        senderSession.tableDisplayNumber ?? String(senderSession.tableNumber),
      receiverSessionId: receiverSession.id,
      receiverTableId: params.receiverTableId,
      receiverTableNumber:
        receiverSession.tableDisplayNumber ?? String(receiverSession.tableNumber),
      productId: product.id,
      productName: product.nameAr || product.name,
      productImageUrl: product.imageUrl,
      quantity: qty,
      unitPrice,
      totalAmount,
      giftMessage: params.giftMessage?.trim() || null,
      senderDisplayName: params.isAnonymous
        ? null
        : params.senderDisplayName?.trim() || senderSession.customerName,
      isAnonymous: Boolean(params.isAnonymous),
      status: "PENDING_ACCEPTANCE",
      paymentStatus: "unpaid",
      expiresAt: new Date(Date.now() + timeoutMs),
    },
  });

  return serializeGift(gift);
}

export async function respondToGift(
  giftId: string,
  receiverTableId: string,
  accept: boolean
) {
  const gift = await prisma.tableGift.findUnique({ where: { id: giftId } });
  if (!gift) throw new Error("الهدية غير موجودة");
  if (gift.receiverTableId !== receiverTableId) {
    throw new Error("غير مصرح");
  }
  if (gift.status !== "PENDING_ACCEPTANCE") {
    throw new Error("لا يمكن تغيير حالة هذه الهدية");
  }
  if (gift.expiresAt < new Date()) {
    await prisma.tableGift.update({
      where: { id: giftId },
      data: { status: "EXPIRED", expiredAt: new Date() },
    });
    throw new Error("انتهت صلاحية الهدية");
  }

  const now = new Date();
  const updated = await prisma.tableGift.update({
    where: { id: giftId },
    data: accept
      ? { status: "PAYMENT_PENDING", acceptedAt: now }
      : { status: "REJECTED", rejectedAt: now },
  });
  return serializeGift(updated);
}

export async function payForGift(params: {
  giftId: string;
  senderTableId: string;
  method?: string;
}) {
  const gift = await prisma.tableGift.findUnique({
    where: { id: params.giftId },
    include: { restaurant: true },
  });
  if (!gift) throw new Error("الهدية غير موجودة");
  if (gift.senderTableId !== params.senderTableId) {
    throw new Error("الدفع متاح لمرسل الهدية فقط");
  }
  if (gift.status !== "PAYMENT_PENDING") {
    throw new Error("الهدية غير جاهزة للدفع");
  }

  const restaurant = gift.restaurant;
  const receiverTable = await prisma.diningTable.findUnique({
    where: { id: gift.receiverTableId },
  });
  if (!receiverTable) throw new Error("طاولة المستلم غير موجودة");

  const receiverSession = await getActiveSessionForTable(gift.receiverTableId);
  const totalAmount = Number(gift.totalAmount);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

  const lastOrder = await prisma.order.findFirst({
    where: { branchId: gift.branchId! },
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
        description: `هدية — ${gift.productName}`,
        method: params.method || "MADA",
        callbackUrl: `${appUrl}/order-status/pending`,
        metadata: { giftId: gift.id, orderNumber: String(orderNumber) },
      }
    );
  } catch {
    throw new Error("فشل الدفع");
  }

  if (paymentResult.status !== "PAID") {
    throw new Error("لم يتم إتمام الدفع");
  }

  const order = await prisma.order.create({
    data: {
      branchId: gift.branchId!,
      tableId: gift.receiverTableId,
      tableSessionId: receiverSession?.id,
      tableNumber: receiverTable.number,
      tableLabel: receiverSession?.tableLabel ?? receiverTable.label,
      customerName: receiverSession?.customerName ?? "هدية",
      orderNumber,
      status: "NEW",
      subtotal: totalAmount,
      totalAmount,
      notes: gift.giftMessage
        ? `🎁 هدية من طاولة ${gift.senderTableNumber}: ${gift.giftMessage}`
        : `🎁 هدية من طاولة ${gift.senderTableNumber}`,
      items: {
        create: [
          {
            menuItemId: gift.productId,
            name: gift.productName,
            quantity: gift.quantity,
            unitPrice: Number(gift.unitPrice),
            totalPrice: totalAmount,
          },
        ],
      },
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
  });

  const updated = await prisma.tableGift.update({
    where: { id: gift.id },
    data: {
      status: "PREPARING",
      paymentStatus: "paid",
      paidAt: new Date(),
      orderId: order.id,
    },
  });

  await prisma.menuItem.update({
    where: { id: gift.productId },
    data: { orderCount: { increment: gift.quantity } },
  });

  return {
    gift: serializeGift(updated),
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    },
  };
}

export async function listGiftsForTable(tableId: string, role: "sender" | "receiver" | "all") {
  const table = await prisma.diningTable.findUnique({
    where: { id: tableId },
    include: { branch: { select: { restaurantId: true } } },
  });
  if (!table) throw new Error("الطاولة غير موجودة");

  await assertGiftsEnabled(table.branch.restaurantId);
  await expireStaleGifts(table.branch.restaurantId);

  const where =
    role === "sender"
      ? { senderTableId: tableId }
      : role === "receiver"
        ? { receiverTableId: tableId }
        : {
            OR: [{ senderTableId: tableId }, { receiverTableId: tableId }],
          };

  const gifts = await prisma.tableGift.findMany({
    where: { restaurantId: table.branch.restaurantId, ...where },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return gifts.map(serializeGift);
}

export async function listRestaurantGifts(restaurantId: string, limit = 200) {
  await expireStaleGifts(restaurantId);
  const gifts = await prisma.tableGift.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return gifts.map(serializeGift);
}

export async function updateGiftStatusAdmin(
  giftId: string,
  restaurantId: string,
  status: TableGiftStatus
) {
  const gift = await prisma.tableGift.findFirst({
    where: { id: giftId, restaurantId },
  });
  if (!gift) throw new Error("الهدية غير موجودة");

  const data: Record<string, unknown> = { status };
  if (status === "DELIVERED") data.deliveredAt = new Date();

  const updated = await prisma.tableGift.update({
    where: { id: giftId },
    data,
  });
  return serializeGift(updated);
}
