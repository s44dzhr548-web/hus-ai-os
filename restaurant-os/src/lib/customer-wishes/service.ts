import type { CustomerWishStatus, CustomerWishType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { assertCustomerTableSession } from "@/lib/customer-table-session";
import { WISH_TYPE_LABELS_AR, WISH_STATUS_LABELS_AR } from "./types";

function serializeWish(w: {
  id: string;
  type: CustomerWishType;
  message: string;
  status: CustomerWishStatus;
  tableNumber: string | null;
  customerName: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: w.id,
    type: w.type,
    typeLabel: WISH_TYPE_LABELS_AR[w.type],
    message: w.message,
    status: w.status,
    statusLabel: WISH_STATUS_LABELS_AR[w.status],
    tableNumber: w.tableNumber,
    customerName: w.customerName,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export async function assertWishesEnabled(restaurantId: string) {
  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { customerWishesEnabled: true },
  });
  if (!r?.customerWishesEnabled) {
    throw new Error("ميزة الأمنيات غير مفعّلة");
  }
}

export async function createCustomerWish(params: {
  tableId: string;
  type: CustomerWishType;
  message: string;
  customerName?: string | null;
}) {
  const ctx = await assertCustomerTableSession(params.tableId);
  await assertWishesEnabled(ctx.restaurantId!);

  const message = params.message?.trim();
  if (!message || message.length < 2) {
    throw new Error("يرجى كتابة الأمنية");
  }
  if (message.length > 2000) {
    throw new Error("النص طويل جداً");
  }

  const validTypes: CustomerWishType[] = [
    "OCCASION",
    "CONGRATULATION",
    "SPECIAL_REQUEST",
    "NOTE",
  ];
  if (!validTypes.includes(params.type)) {
    throw new Error("نوع الأمنية غير صالح");
  }

  const wish = await prisma.customerWish.create({
    data: {
      restaurantId: ctx.restaurantId!,
      branchId: ctx.branchId,
      tableId: ctx.tableId!,
      sessionId: ctx.sessionId!,
      tableNumber: ctx.tableDisplayNumber,
      customerName: params.customerName?.trim() || ctx.customerName,
      type: params.type,
      message,
      status: "SUBMITTED",
    },
  });

  return serializeWish(wish);
}

export async function listWishesForTable(tableId: string) {
  const ctx = await assertCustomerTableSession(tableId);
  const wishes = await prisma.customerWish.findMany({
    where: { sessionId: ctx.sessionId! },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return wishes.map(serializeWish);
}

export async function listRestaurantWishes(restaurantId: string) {
  const wishes = await prisma.customerWish.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return wishes.map(serializeWish);
}

export async function updateWishStatusAdmin(
  wishId: string,
  restaurantId: string,
  status: CustomerWishStatus
) {
  const wish = await prisma.customerWish.findFirst({
    where: { id: wishId, restaurantId },
  });
  if (!wish) throw new Error("الأمنية غير موجودة");

  const now = new Date();
  const data: {
    status: CustomerWishStatus;
    respondedAt?: Date;
    completedAt?: Date;
  } = { status };

  if (status === "ACCEPTED" || status === "REJECTED") {
    data.respondedAt = now;
  }
  if (status === "COMPLETED") {
    data.completedAt = now;
    data.respondedAt = wish.respondedAt ?? now;
  }

  const updated = await prisma.customerWish.update({
    where: { id: wishId },
    data,
  });
  return serializeWish(updated);
}
