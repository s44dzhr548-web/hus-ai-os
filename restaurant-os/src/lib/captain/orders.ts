import prisma from "@/lib/prisma";
import type { OrderStatus, Prisma } from "@prisma/client";
import { tableIconEmoji } from "@/lib/table-meta";
import {
  canTransitionCaptainStatus,
  captainActiveStatuses,
  captainStatusTimestampField,
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
  idempotencyKey?: string;
  guestToken?: string;
};

function effectivePrice(item: { price: unknown; discountPrice: unknown | null }) {
  const price = Number(item.price);
  const discount = item.discountPrice != null ? Number(item.discountPrice) : null;
  if (discount != null && discount > 0 && discount < price) return discount;
  return price;
}

function serializeOrder(order: {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  subtotal: unknown;
  totalAmount: unknown;
  notes: string | null;
  tableId: string | null;
  tableNumber: number | null;
  tableLabel: string | null;
  tableIcon: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  preparingAt: Date | null;
  readyAt: Date | null;
  servedAt: Date | null;
  cancelledAt: Date | null;
  updatedAt: Date;
  items: Array<{
    id: string;
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
    tableId: order.tableId,
    tableNumber: order.tableNumber ?? order.table?.number ?? null,
    tableLabel: order.tableLabel ?? order.table?.label ?? null,
    tableIconEmoji: tableIconEmoji(order.tableIcon ?? order.table?.tableIcon),
    createdAt: order.createdAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    preparingAt: order.preparingAt?.toISOString() ?? null,
    readyAt: order.readyAt?.toISOString() ?? null,
    servedAt: order.servedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((i) => ({
      id: i.id,
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

  const menuItemIds = input.items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      isAvailable: true,
      category: { restaurantId: table.branch.restaurantId },
    },
  });

  if (menuItems.length !== input.items.length) {
    throw new Error("بعض المنتجات غير متاحة");
  }

  const itemMap = Object.fromEntries(menuItems.map((m) => [m.id, m]));
  let subtotal = 0;
  const orderItemsData = input.items.map((item) => {
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
      notes: item.notes?.trim() || null,
    };
  });

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

  const order = await prisma.order.create({
    data: {
      branchId: table.branchId,
      tableId: table.id,
      tableNumber: table.number,
      tableLabel: table.label,
      tableIcon: table.tableIcon,
      tableSessionId: activeSession?.id,
      customerProfileId,
      orderNumber,
      status: "NEW",
      orderSource: "CAPTAIN",
      idempotencyKey: input.idempotencyKey || null,
      subtotal,
      totalAmount: subtotal,
      notes: orderNotes,
      items: { create: orderItemsData },
    },
    include: orderInclude,
  });

  return serializeOrder(order);
}

export async function getCaptainOrderPublic(orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, orderSource: "CAPTAIN" },
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

  return {
    ...serializeOrder(order),
    orderSource: order.orderSource,
    restaurant: {
      name: order.branch.restaurant.nameAr || order.branch.restaurant.name,
      logoUrl: order.branch.restaurant.logoUrl,
    },
    branch: order.branch.nameAr || order.branch.name,
  };
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

  const [newCount, preparingCount, readyCount, servedToday] = await Promise.all([
    prisma.order.count({
      where: { branch: { restaurantId }, orderSource: "CAPTAIN", status: "NEW" },
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
        status: "SERVED",
        servedAt: { gte: todayStart },
      },
    }),
  ]);

  return { newCount, preparingCount, readyCount, servedToday };
}

export async function updateCaptainOrderStatus(
  restaurantId: string,
  orderId: string,
  nextStatus: OrderStatus
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

  const updated = await prisma.order.update({
    where: { id: orderId },
    data,
    include: orderInclude,
  });

  return serializeOrder(updated);
}

export async function listTableCaptainHistory(restaurantId: string, tableId: string) {
  return listCaptainOrders(restaurantId, {
    tableId,
    limit: 30,
  });
}

export { captainActiveStatuses, serializeOrder };
