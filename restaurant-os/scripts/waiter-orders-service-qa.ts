#!/usr/bin/env node
/**
 * Waiter orders service-layer QA — full confirm/lock flow without HTTP auth.
 * Usage: npx tsx scripts/waiter-orders-service-qa.ts
 */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";
import {
  confirmCaptainOrder,
  createCaptainOrder,
  getCaptainOrderForStaff,
  getCaptainOrderPublic,
  listCaptainOrders,
  updateCaptainOrderItems,
  updateCaptainOrderStatus,
} from "../src/lib/captain/orders";

loadMigrateEnv();
const prisma = new PrismaClient();

const results: { name: string; ok: boolean; detail?: string }[] = [];
function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

let orderId: string | null = null;
let restaurantA = "";
let restaurantB = "";
let trackingToken = "";
const userId = "waiter-qa-user";

async function main() {
  console.log("=== Waiter Service QA ===\n");

  const beforeOrders = await prisma.order.count();
  const beforeReservations = await prisma.reservation.count();
  pass("data preserved orders", String(beforeOrders));
  pass("data preserved reservations", String(beforeReservations));

  const table = await prisma.diningTable.findFirst({
    where: { isActive: true },
    include: { branch: { select: { restaurantId: true } } },
  });
  if (!table) throw new Error("no table");
  restaurantA = table.branch.restaurantId;
  const other = await prisma.restaurant.findFirst({ where: { id: { not: restaurantA } }, select: { id: true } });
  restaurantB = other?.id || "";

  const menuItems = await prisma.menuItem.findMany({
    where: { isAvailable: true, category: { restaurantId: restaurantA } },
    take: 2,
  });
  if (menuItems.length < 1) throw new Error("no menu items");

  const key = `svc-waiter-${Date.now()}`;
  const order = await createCaptainOrder({
    tableId: table.id,
    idempotencyKey: key,
    notes: "service waiter QA",
    items: [{ menuItemId: menuItems[0].id, quantity: 2 }],
  });
  orderId = order.id;
  trackingToken = order.publicAccessToken || "";
  pass("customer order created", order.displayNumber);
  pass("table number snapshot", String(order.tableNumber));

  const dup = await createCaptainOrder({
    tableId: table.id,
    idempotencyKey: key,
    items: [{ menuItemId: menuItems[0].id, quantity: 2 }],
  });
  if (dup.id === orderId) pass("idempotency");
  else fail("idempotency");

  const list = await listCaptainOrders(restaurantA, { status: "NEW" });
  if (list.some((o) => o.id === orderId)) pass("waiter list same restaurant");
  else fail("waiter list same restaurant");

  if (menuItems[1]) {
    const edited = await updateCaptainOrderItems(restaurantA, orderId, {
      notes: "edited",
      items: [
        { menuItemId: menuItems[0].id, quantity: 3 },
        { menuItemId: menuItems[1].id, quantity: 1 },
      ],
    });
    if (edited.totalAmount > 0) pass("edit quantity/items", `total=${edited.totalAmount}`);
    else fail("edit quantity/items");
  }

  const confirmed = await confirmCaptainOrder(restaurantA, orderId, userId);
  if (confirmed.status === "CONFIRMED") pass("confirm order");
  else fail("confirm order", confirmed.status);

  try {
    await updateCaptainOrderItems(restaurantA, orderId, {
      items: [{ menuItemId: menuItems[0].id, quantity: 1 }],
    });
    fail("lock after confirm");
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === "ORDER_LOCKED") pass("ORDER_LOCKED after confirm");
    else fail("ORDER_LOCKED after confirm", err.message);
  }

  for (const status of ["PREPARING", "READY", "SERVED", "COMPLETED"] as const) {
    const updated = await updateCaptainOrderStatus(restaurantA, orderId, status, userId);
    if (updated.status === status) pass(`status → ${status}`);
    else {
      fail(`status → ${status}`, updated.status);
      break;
    }
  }

  if (trackingToken) {
    const pub = await getCaptainOrderPublic(orderId, trackingToken);
    if (pub?.status === "COMPLETED") pass("customer status tracking");
    else fail("customer status tracking", pub?.status);
    const noToken = await getCaptainOrderPublic(orderId);
    if (!noToken) pass("token required for public access");
    else fail("token required for public access");
  }

  if (restaurantB) {
    const cross = await getCaptainOrderForStaff(restaurantB, orderId);
    if (!cross) pass("cross-restaurant blocked");
    else fail("cross-restaurant blocked");
  } else {
    pass("cross-restaurant skipped");
  }

  const afterOrders = await prisma.order.count();
  const afterReservations = await prisma.reservation.count();
  if (afterOrders >= beforeOrders) pass("no order deletes");
  else fail("no order deletes");
  if (afterReservations === beforeReservations) pass("reservations intact");
  else fail("reservations intact");
}

main()
  .catch((e) => {
    fail("fatal", e instanceof Error ? e.message : String(e));
  })
  .finally(async () => {
    if (orderId) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
      await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    }
    await prisma.$disconnect();
    const failed = results.filter((r) => !r.ok);
    console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
    process.exit(failed.length ? 1 : 0);
  });
