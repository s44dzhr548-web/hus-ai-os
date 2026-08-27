#!/usr/bin/env node
/** Service-layer captain orders QA (no HTTP). */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

loadMigrateEnv();

const { createCaptainOrder, getCaptainOrderPublic, listCaptainOrders, updateCaptainOrderStatus } =
  await import("../src/lib/captain/orders.ts");

const prisma = new PrismaClient();
let orderId = null;

try {
  const table = await prisma.diningTable.findFirst({
    where: { number: 12, isActive: true },
    include: { branch: { select: { restaurantId: true } } },
  });
  const menuItem = await prisma.menuItem.findFirst({
    where: { isAvailable: true, category: { restaurantId: table.branch.restaurantId } },
  });
  const key = `svc-qa-${Date.now()}`;

  const order = await createCaptainOrder({
    tableId: table.id,
    idempotencyKey: key,
    notes: "service QA",
    items: [{ menuItemId: menuItem.id, quantity: 2, notes: "بدون ثوم" }],
  });
  orderId = order.id;
  console.log("✓ create", order.displayNumber, order.status);

  const dup = await createCaptainOrder({
    tableId: table.id,
    idempotencyKey: key,
    items: [{ menuItemId: menuItem.id, quantity: 2 }],
  });
  if (dup.id !== orderId) throw new Error("idempotency failed");
  console.log("✓ idempotency");

  for (const status of ["ACCEPTED", "PREPARING", "READY", "SERVED"]) {
    const updated = await updateCaptainOrderStatus(table.branch.restaurantId, orderId, status);
    console.log(`✓ ${status}`);
    if (updated.status !== status) throw new Error(`expected ${status}`);
  }

  const pub = await getCaptainOrderPublic(orderId);
  if (pub.status !== "SERVED") throw new Error("public status");
  console.log("✓ public status");

  const list = await listCaptainOrders(table.branch.restaurantId, { tableId: table.id });
  if (!list.some((o) => o.id === orderId)) throw new Error("list missing order");
  console.log("✓ list by table", list.length);

  const db = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderSource: true, acceptedAt: true, preparingAt: true, readyAt: true, servedAt: true },
  });
  if (db.orderSource !== "CAPTAIN" || !db.acceptedAt || !db.servedAt) throw new Error("timestamps");
  console.log("✓ timestamps saved");
  console.log("\n=== captain service QA passed ===");
} catch (e) {
  console.error("✗", e.message || e);
  process.exitCode = 1;
} finally {
  if (orderId) {
    await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
    await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
  }
  await prisma.$disconnect();
}
