import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";
import { tableIconEmoji } from "@/lib/table-meta";
import {
  canTransitionCaptainStatus,
  captainActiveStatuses,
  captainStatusTimestampField,
  isCaptainOrderEditable,
  isCaptainOrderLocked,
} from "@/lib/captain/status";

export type CaptainOrderItemInput = {
  menuItemId: string;
  quantity: number;
  notes?: string;
};

export type CreateCaptainOrderInput = {
  tableId: string;
  items: CaptainOrderItemInput[];
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  idempotencyKey?: string;
  guestToken?: string;
};

function effectivePrice(item: { price: unknown; discountPrice: unknown | null }) {
  const price = Number(item.price);
  const discount = item.discountPrice != null ? Number(item.discountPrice) : null;
  if (discount != null && discount > 0 && discount < price) return discount;
  return price;
}

function generatePublicAccessToken() {
  return randomBytes(24).toString("base64url");
}

function serializeOrder(order: {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  subtotal: unknown;
  totalAmount: unknown;
  notes: string | null;
  customerName: string | null;
  tableId: string | null;
  tableNumber: number | null;
  tableLabel: string | null;
  tableIcon: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  confirmedAt: Date | null;
  confirmedByUserId: string | null;
  preparingAt: Date | null;
  readyAt: Date | null;
  servedAt: Date | null;
  cancelledAt: Date | null;
  updatedAt: Date;
  publicAccessToken?: string | null;
  items: Array<{
    id: string;
    menuItemId: string;
    name: string;
    nameAr: string | null;
    quantity: number;
    unitPrice: unknown;
    totalPrice: unknown;
    notes: string | null;
  }>;
  table?: { number: number; label: string | null; tableIcon: string | null } | null;
}) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    displayNumber: `#${order.orderNumber}`,
    status: order.status,
    subtotal: Number(order.subtotal),
    totalAmount: Number(order.totalAmount),
    notes: order.notes,
    customerName: order.customerName,
    tableId: order.tableId,
    tableNumber: order.tableNumber ?? order.table?.number ?? null,
    tableLabel: order.tableLabel ?? order.table?.label ?? null,
    tableIconEmoji: tableIconEmoji(order.tableIcon ?? order.table?.tableIcon),
    createdAt: order.createdAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    confirmedByUserId: order.confirmedByUserId,
    preparingAt: order.preparingAt?.toISOString() ?? null,
    readyAt: order.readyAt?.toISOString() ?? null,
    servedAt: order.servedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    updatedAt: order.updatedAt.toISOString(),
    isEditable: isCaptainOrderEditable(order.status),
    isLocked: isCaptainOrderLocked(order.status),
    publicAccessToken: order.publicAccessToken ?? undefined,
    items: order.items.map((i) => ({
      id: i.id,
      menuItemId: i.menuItemId,
      name: i.nameAr || i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      notes: i.notes,
    })),
  };
}

const orderInclude = {
  items: true,
  table: { select: { number: true, label: true, tableIcon: true } },
} as const;

async function recordOrderStatusHistory(
  tx: Prisma.TransactionClient,
  orderId: string,
  fromStatus: OrderStatus | null,
  toStatus: OrderStatus,
  changedByUserId?: string | null
) {
  await tx.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus,
      toStatus,
      changedByUserId: changedByUserId ?? null,
    },
  });
}

async function buildOrderItemsData(
  restaurantId: string,
  items: CaptainOrderItemInput[]
) {
  if (!items.length) {
    throw new Error("يجب أن يحتوي الطلب على صنف واحد على الأقل");
  }

  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      isAvailable: true,
      category: { restaurantId },
    },
  });

  if (menuItems.length !== items.length) {
    throw new Error("بعض المنتجات غير متاحة");
  }

  const itemMap = Object.fromEntries(menuItems.map((m) => [m.id, m]));
  let subtotal = 0;
  const orderItemsData = items.map((item) => {
    const menuItem = itemMap[item.menuItemId];
    const unitPrice = effectivePrice(menuItem);
    const quantity = Math.max(1, Math.floor(item.quantity));
    const totalPrice = unitPrice * quantity;
    subtotal += totalPrice;
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      nameAr: menuItem.nameAr,
      quantity,
      unitPrice,
      totalPrice,
      notes: item.notes?.trim() || null,
    };
  });

  return { subtotal, orderItemsData };
}

export async function createCaptainOrder(input: CreateCaptainOrderInput) {
  if (!input.tableId || !input.items.length) {
    throw new Error("الطاولة والمنتجات مطلوبة");
  }

  if (input.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: orderInclude,
    });
    if (existing) {
      return serializeOrder(existing);
    }
  }

  const table = await prisma.diningTable.findUnique({
    where: { id: input.tableId },
    include: { branch: { include: { restaurant: true } } },
  });

  if (!table || !table.isActive) {
    throw new Error("الطاولة غير موجودة");
  }

  const { subtotal, orderItemsData } = await buildOrderItemsData(
    table.branch.restaurantId,
    input.items
  );

  const lastOrder = await prisma.order.findFirst({
    where: { branchId: table.branchId },
    orderBy: { orderNumber: "desc" },
  });
  const orderNumber = (lastOrder?.orderNumber ?? 1000) + 1;

  const activeSession = await prisma.tableSession.findFirst({
    where: {
      tableId: table.id,
      endedAt: null,
      status: { not: "COMPLETED" },
    },
    orderBy: { startedAt: "desc" },
  });

  let customerProfileId: string | undefined;
  if (activeSession?.customerVisitId) {
    const visit = await prisma.customerVisit.findUnique({
      where: { id: activeSession.customerVisitId },
      select: { customerProfileId: true },
    });
    customerProfileId = visit?.customerProfileId ?? undefined;
  }

  const orderNotes = [
    input.notes?.trim(),
    input.guestToken ? `guest:${input.guestToken}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || null;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        branchId: table.branchId,
        tableId: table.id,
        tableNumber: table.number,
        tableLabel: table.label,
        tableIcon: table.tableIcon,
        tableSessionId: activeSession?.id,
        customerProfileId,
        customerName: input.customerName?.trim() || null,
        orderNumber,
        status: "NEW",
        orderSource: "CAPTAIN",
        idempotencyKey: input.idempotencyKey || null,
        publicAccessToken: generatePublicAccessToken(),
        subtotal,
        totalAmount: subtotal,
        notes: orderNotes,
        items: { create: orderItemsData },
      },
      include: orderInclude,
    });

    await recordOrderStatusHistory(tx, created.id, null, "NEW");
    return created;
  });

  return serializeOrder(order);
}

export async function getCaptainOrderPublic(orderId: string, accessToken?: string | null) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      orderSource: "CAPTAIN",
    },
    include: {
      ...orderInclude,
      branch: {
        select: {
          name: true,
          nameAr: true,
          restaurant: { select: { name: true, nameAr: true, logoUrl: true } },
        },
      },
    },
  });
  if (!order) return null;

  if (order.publicAccessToken) {
    if (!accessToken || accessToken !== order.publicAccessToken) {
      return null;
    }
  }

  return {
    ...serializeOrder(order),
    orderSource: order.orderSource,
    table: order.tableId
      ? {
          id: order.tableId,
          number: order.tableNumber ?? order.table?.number ?? 0,
          label: order.tableLabel ?? order.table?.label ?? undefined,
        }
      : null,
    restaurant: {
      name: order.branch.restaurant.nameAr || order.branch.restaurant.name,
      logoUrl: order.branch.restaurant.logoUrl,
    },
    branch: order.branch.nameAr || order.branch.name,
  };
}

export async function getCaptainOrderForStaff(restaurantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, orderSource: "CAPTAIN", branch: { restaurantId } },
    include: orderInclude,
  });
  if (!order) return null;
  return serializeOrder(order);
}

export async function listCaptainOrders(
  restaurantId: string,
  opts?: {
    status?: OrderStatus | OrderStatus[];
    tableId?: string;
    search?: string;
    limit?: number;
  }
) {
  const statuses = opts?.status
    ? Array.isArray(opts.status)
      ? opts.status
      : [opts.status]
    : undefined;

  const where: Prisma.OrderWhereInput = {
    orderSource: "CAPTAIN",
    branch: { restaurantId },
    ...(statuses ? { status: { in: statuses } } : {}),
    ...(opts?.tableId ? { tableId: opts.tableId } : {}),
  };

  if (opts?.search?.trim()) {
    const q = opts.search.trim();
    const num = parseInt(q.replace(/^#/, ""), 10);
    where.OR = [
      ...(Number.isFinite(num) ? [{ orderNumber: num }] : []),
      { tableLabel: { contains: q, mode: "insensitive" } },
    ];
    if (Number.isFinite(num)) {
      where.OR.push({ tableNumber: num });
    }
  }

  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: opts?.limit ?? 80,
  });

  return orders.map(serializeOrder);
}

export async function getCaptainStats(restaurantId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [newCount, confirmedCount, preparingCount, readyCount, servedToday] = await Promise.all([
    prisma.order.count({
      where: { branch: { restaurantId }, orderSource: "CAPTAIN", status: "NEW" },
    }),
    prisma.order.count({
      where: {
        branch: { restaurantId },
        orderSource: "CAPTAIN",
        status: { in: ["CONFIRMED", "ACCEPTED"] },
      },
    }),
    prisma.order.count({
      where: { branch: { restaurantId }, orderSource: "CAPTAIN", status: "PREPARING" },
    }),
    prisma.order.count({
      where: { branch: { restaurantId }, orderSource: "CAPTAIN", status: "READY" },
    }),
    prisma.order.count({
      where: {
        branch: { restaurantId },
        orderSource: "CAPTAIN",
        status: { in: ["SERVED", "COMPLETED"] },
        OR: [{ servedAt: { gte: todayStart } }, { completedAt: { gte: todayStart } }],
      },
    }),
  ]);

  return { newCount, confirmedCount, preparingCount, readyCount, servedToday };
}

export async function updateCaptainOrderItems(
  restaurantId: string,
  orderId: string,
  input: { items: CaptainOrderItemInput[]; notes?: string }
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, orderSource: "CAPTAIN", branch: { restaurantId } },
    include: orderInclude,
  });

  if (!order) {
    throw new Error("الطلب غير موجود");
  }

  if (isCaptainOrderLocked(order.status)) {
    const err = new Error("تم تأكيد الطلب ولا يمكن تعديل محتواه.");
    (err as Error & { code: string }).code = "ORDER_LOCKED";
    throw err;
  }

  const { subtotal, orderItemsData } = await buildOrderItemsData(restaurantId, input.items);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId } });
    const result = await tx.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        totalAmount: subtotal,
        notes: input.notes !== undefined ? input.notes?.trim() || null : order.notes,
        items: { create: orderItemsData },
      },
      include: orderInclude,
    });
    return result;
  });

  return serializeOrder(updated);
}

export async function confirmCaptainOrder(
  restaurantId: string,
  orderId: string,
  userId: string
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, orderSource: "CAPTAIN", branch: { restaurantId } },
    include: orderInclude,
  });

  if (!order) {
    throw new Error("الطلب غير موجود");
  }

  if (order.status !== "NEW") {
    if (order.status === "CONFIRMED" || order.status === "ACCEPTED") {
      return serializeOrder(order);
    }
    const err = new Error("تم تأكيد الطلب ولا يمكن تعديل محتواه.");
    (err as Error & { code: string }).code = "ORDER_LOCKED";
    throw err;
  }

  if (!order.items.length) {
    throw new Error("لا يمكن تأكيد طلب بدون أصناف");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedByUserId: userId,
      },
      include: orderInclude,
    });
    await recordOrderStatusHistory(tx, orderId, "NEW", "CONFIRMED", userId);
    return result;
  });

  return serializeOrder(updated);
}

export async function updateCaptainOrderStatus(
  restaurantId: string,
  orderId: string,
  nextStatus: OrderStatus,
  userId?: string | null
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, orderSource: "CAPTAIN", branch: { restaurantId } },
    include: orderInclude,
  });

  if (!order) {
    throw new Error("الطلب غير موجود");
  }

  if (order.status === nextStatus) {
    return serializeOrder(order);
  }

  if (!canTransitionCaptainStatus(order.status, nextStatus)) {
    throw new Error(`لا يمكن تغيير الحالة من ${order.status} إلى ${nextStatus}`);
  }

  const tsField = captainStatusTimestampField(nextStatus);
  const data: Prisma.OrderUpdateInput = { status: nextStatus };
  if (tsField) {
    (data as Record<string, unknown>)[tsField] = new Date();
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data,
      include: orderInclude,
    });
    await recordOrderStatusHistory(tx, orderId, order.status, nextStatus, userId);
    return result;
  });

  return serializeOrder(updated);
}

export async function listTableCaptainHistory(restaurantId: string, tableId: string) {
  return listCaptainOrders(restaurantId, {
    tableId,
    limit: 30,
  });
}

export async function listCaptainMenuItems(restaurantId: string) {
  const items = await prisma.menuItem.findMany({
    where: {
      isAvailable: true,
      category: { restaurantId, isActive: true },
    },
    select: {
      id: true,
      name: true,
      nameAr: true,
      price: true,
      discountPrice: true,
      category: { select: { name: true, nameAr: true } },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    take: 200,
  });

  return items.map((item) => ({
    id: item.id,
    name: item.nameAr || item.name,
    category: item.category.nameAr || item.category.name,
    unitPrice: effectivePrice(item),
  }));
}

export { captainActiveStatuses, serializeOrder, isCaptainOrderEditable, isCaptainOrderLocked };
