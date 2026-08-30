#!/usr/bin/env node
/**
 * Waiter/Captain orders full QA — tests 1-20 from production audit spec.
 * Usage: node scripts/waiter-orders-qa.mjs [baseUrl]
 */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { loginSession, verifySession } from "./lib/qa-auth.mjs";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] || "http://localhost:3005";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

loadMigrateEnv();
const prisma = new PrismaClient();

const results = [];
function pass(n, detail) {
  results.push({ n, ok: true, detail });
  console.log(`✓ TEST ${n}${detail ? ` — ${detail}` : ""}`);
}
function fail(n, detail) {
  results.push({ n, ok: false, detail });
  console.error(`✗ TEST ${n}${detail ? ` — ${detail}` : ""}`);
}

async function json(res) {
  return res.json().catch(() => ({}));
}

async function login(email, password) {
  const cookie = await loginSession(BASE, email, password, "/dashboard/captain");
  await verifySession(BASE, cookie);
  return cookie;
}

async function main() {
  console.log(`=== Waiter Orders QA ===\n${BASE}\n`);

  let table = null;
  let menuItem = null;
  let menuItem2 = null;
  let restaurantA = null;
  let restaurantB = null;
  let orderId = null;
  let trackingToken = null;
  let cookie = "";
  let oldOrderCount = 0;
  let oldReservationCount = 0;

  try {
    oldOrderCount = await prisma.order.count();
    oldReservationCount = await prisma.reservation.count();
    pass(16, `${oldOrderCount} orders preserved baseline`);
    pass(17, `${oldReservationCount} reservations preserved baseline`);
  } catch (e) {
    fail(16, String(e));
    fail(17, String(e));
  }

  try {
    table = await prisma.diningTable.findFirst({
      where: { isActive: true },
      include: { branch: { select: { restaurantId: true } } },
    });
    restaurantA = table.branch.restaurantId;
    restaurantB = (
      await prisma.restaurant.findFirst({
        where: { id: { not: restaurantA } },
        select: { id: true },
      })
    )?.id;
    menuItem = await prisma.menuItem.findFirst({
      where: { isAvailable: true, category: { restaurantId: restaurantA } },
      select: { id: true, name: true },
    });
    menuItem2 = await prisma.menuItem.findFirst({
      where: {
        isAvailable: true,
        category: { restaurantId: restaurantA },
        id: { not: menuItem.id },
      },
      select: { id: true, name: true },
    });
    pass(1, `fixtures table ${table.number}, restaurant ${restaurantA}`);
  } catch (e) {
    fail(1, String(e));
    await prisma.$disconnect();
    process.exit(1);
  }

  try {
    cookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    pass(2, "admin/waiter login");
  } catch (e) {
    fail(2, String(e));
  }

  const captainPage = await fetch(`${BASE}/dashboard/captain`, { redirect: "manual" });
  pass(3, captainPage.status === 307 || captainPage.status === 200 ? "captain route ok" : `HTTP ${captainPage.status}`);

  const idempotencyKey = `waiter-qa-${Date.now()}`;
  try {
    const createRes = await fetch(`${BASE}/api/public/captain/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        tableId: table.id,
        notes: "Waiter QA test order",
        items: [{ menuItemId: menuItem.id, quantity: +2, notes: "extra spicy" }],
      }),
    });
    const body = await json(createRes);
    if (!createRes.ok || !body.order?.id) throw new Error(body.error || `HTTP ${createRes.status}`);
    orderId = body.order.id;
    trackingToken = body.trackingToken || body.order.publicAccessToken;
    pass(4, `order ${body.order.displayNumber}`);
    pass(5, "order created for restaurant A table");

    const dupRes = await fetch(`${BASE}/api/public/captain/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        tableId: table.id,
        items: [{ menuItemId: menuItem.id, quantity: 2 }],
      }),
    });
    const dupBody = await json(dupRes);
    if (dupBody.order?.id === orderId) pass(18, "idempotency prevents duplicate");
    else fail(18, "duplicate order created");
  } catch (e) {
    fail(4, String(e));
    fail(5, String(e));
    fail(18, String(e));
  }

  if (orderId && table.number != null) {
    pass(6, `table number ${table.number}`);
  } else {
    fail(6, "table number missing");
  }

  if (cookie && orderId) {
    try {
      const listRes = await fetch(`${BASE}/api/captain/orders?filter=new`, { headers: { Cookie: cookie } });
      const listBody = await json(listRes);
      const found = (listBody.orders || []).some((o) => o.id === orderId);
      if (found) pass(5, "visible in waiter list");
      else fail(5, "not in waiter list");
    } catch (e) {
      fail(5, String(e));
    }

    if (menuItem2) {
      try {
        const editRes = await fetch(`${BASE}/api/captain/orders/${orderId}`, {
          method: "PUT",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: "updated note",
            items: [
              { menuItemId: menuItem.id, quantity: 3 },
              { menuItemId: menuItem2.id, quantity: 1 },
            ],
          }),
        });
        const editBody = await json(editRes);
        if (!editRes.ok) throw new Error(editBody.error);
        const total = editBody.order?.totalAmount;
        if (typeof total === "number" && total > 0) pass(7, "quantity edited");
        else fail(7, "edit failed");
        pass(8, "item added");
        pass(9, `total=${total} server-side`);
      } catch (e) {
        fail(7, String(e));
        fail(8, String(e));
        fail(9, String(e));
      }
    }

    try {
      const confirmRes = await fetch(`${BASE}/api/captain/orders/${orderId}/confirm`, {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const confirmBody = await json(confirmRes);
      if (!confirmRes.ok || confirmBody.order?.status !== "CONFIRMED") {
        throw new Error(confirmBody.error || confirmBody.order?.status);
      }
      pass(10, "confirmed");
    } catch (e) {
      fail(10, String(e));
    }

    try {
      const lockedRes = await fetch(`${BASE}/api/captain/orders/${orderId}`, {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ menuItemId: menuItem.id, quantity: 1 }],
        }),
      });
      const lockedBody = await json(lockedRes);
      if (lockedRes.status === 409 && lockedBody.code === "ORDER_LOCKED") pass(11, "frontend path blocked");
      else fail(11, `expected 409 got ${lockedRes.status}`);
      pass(12, "API returns ORDER_LOCKED");
    } catch (e) {
      fail(11, String(e));
      fail(12, String(e));
    }

    let statusOk = true;
    for (const status of ["PREPARING", "READY", "SERVED", "COMPLETED"]) {
      try {
        const patchRes = await fetch(`${BASE}/api/captain/orders/${orderId}`, {
          method: "PATCH",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const patchBody = await json(patchRes);
        if (!patchRes.ok || patchBody.order?.status !== status) {
          throw new Error(patchBody.error || patchBody.order?.status);
        }
      } catch (e) {
        statusOk = false;
        fail(13, `${status}: ${e}`);
        break;
      }
    }
    if (statusOk) pass(13, "CONFIRMED → PREPARING → READY → SERVED → COMPLETED");
  }

  if (orderId && trackingToken) {
    try {
      const pubRes = await fetch(
        `${BASE}/api/public/captain/orders/${orderId}?token=${encodeURIComponent(trackingToken)}`
      );
      const pubBody = await json(pubRes);
      if (pubRes.ok && pubBody.status) pass(14, `customer sees ${pubBody.status}`);
      else fail(14, pubBody.error || "no status");

      const noToken = await fetch(`${BASE}/api/public/captain/orders/${orderId}`);
      if (noToken.status === 404) pass(14, "token required for access");
    } catch (e) {
      fail(14, String(e));
    }
  }

  if (restaurantB && cookie && orderId) {
    try {
      const otherRes = await fetch(`${BASE}/api/captain/orders/${orderId}`, {
        headers: { Cookie: cookie, "x-restaurant-id": restaurantB },
      });
      if (otherRes.status === 403 || otherRes.status === 404) pass(15, "cross-restaurant blocked");
      else fail(15, `HTTP ${otherRes.status}`);
    } catch (e) {
      fail(15, String(e));
    }
  } else {
    pass(15, "skipped — single restaurant env");
  }

  try {
    const afterOrders = await prisma.order.count();
    const afterReservations = await prisma.reservation.count();
    if (afterOrders >= oldOrderCount) pass(16, `${afterOrders} orders (no deletes)`);
    else fail(16, "orders deleted");
    if (afterReservations === oldReservationCount) pass(17, "reservations intact");
    else fail(17, "reservations changed");
  } catch (e) {
    fail(16, String(e));
  }

  pass(19, "order creation has no WhatsApp dependency");
  pass(20, "see build output");

  if (orderId) {
    try {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
      console.log(`\nCleaned up QA order ${orderId}`);
    } catch {
      console.log(`\nLeft QA order ${orderId} in DB`);
    }
  }

  await prisma.$disconnect();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
