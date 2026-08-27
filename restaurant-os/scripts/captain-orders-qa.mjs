#!/usr/bin/env node
/**
 * Captain orders E2E: create order → status transitions → idempotency.
 * Usage: node scripts/captain-orders-qa.mjs [baseUrl]
 */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] || "http://localhost:3005";
const ADMIN_EMAIL = "admin@menuos.sa";
const ADMIN_PASSWORD = "admin123456";

loadMigrateEnv();
const prisma = new PrismaClient();

const results = [];
function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function json(res) {
  return res.json().catch(() => ({}));
}

async function login(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.map((c) => c.split(";")[0]).join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  return [
    ...cookies.map((c) => c.split(";")[0]),
    ...(loginRes.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
  ].join("; ");
}

async function main() {
  console.log(`=== Captain Orders E2E ===\n${BASE}\n`);

  let table = null;
  let menuItem = null;
  try {
    table = await prisma.diningTable.findFirst({
      where: { number: 12, isActive: true },
      include: { branch: { select: { restaurantId: true } } },
    });
    if (!table) {
      table = await prisma.diningTable.findFirst({
        where: { isActive: true },
        include: { branch: { select: { restaurantId: true } } },
      });
    }
    if (!table) throw new Error("No active table found");

    menuItem = await prisma.menuItem.findFirst({
      where: {
        isAvailable: true,
        category: { restaurantId: table.branch.restaurantId },
      },
      select: { id: true, name: true, price: true },
    });
    if (!menuItem) throw new Error("No menu item for restaurant");

    pass("1. DB fixtures", `table ${table.number} (${table.id}), item ${menuItem.name}`);
  } catch (e) {
    fail("1. DB fixtures", String(e));
    await cleanup();
    process.exit(1);
  }

  const idempotencyKey = `qa-captain-${Date.now()}`;
  let orderId = null;

  try {
    const createRes = await fetch(`${BASE}/api/public/captain/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        tableId: table.id,
        notes: "QA captain order",
        items: [
          { menuItemId: menuItem.id, quantity: 2, notes: "بدون ثوم" },
        ],
      }),
    });
    const createBody = await json(createRes);
    if (!createRes.ok || !createBody.order?.id) {
      throw new Error(createBody.error || `HTTP ${createRes.status}`);
    }
    orderId = createBody.order.id;
    pass("2. Create captain order", createBody.order.displayNumber);
  } catch (e) {
    fail("2. Create captain order", String(e));
    await cleanup();
    process.exit(1);
  }

  try {
    const dupRes = await fetch(`${BASE}/api/public/captain/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        tableId: table.id,
        items: [{ menuItemId: menuItem.id, quantity: 2 }],
      }),
    });
    const dupBody = await json(dupRes);
    if (!dupRes.ok || dupBody.order?.id !== orderId) {
      throw new Error("Idempotency did not return same order");
    }
    pass("3. Idempotency", "same order returned");
  } catch (e) {
    fail("3. Idempotency", String(e));
  }

  try {
    const statusRes = await fetch(`${BASE}/api/public/captain/orders/${orderId}`);
    const statusBody = await json(statusRes);
    if (!statusRes.ok || statusBody.order?.status !== "NEW") {
      throw new Error(statusBody.error || `status ${statusBody.order?.status}`);
    }
    pass("4. Public order status", "NEW");
  } catch (e) {
    fail("4. Public order status", String(e));
  }

  let cookie = "";
  try {
    cookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    pass("5. Admin login");
  } catch (e) {
    fail("5. Admin login", String(e));
    await cleanup(orderId);
    process.exit(1);
  }

  const transitions = ["ACCEPTED", "PREPARING", "READY", "SERVED"];
  for (const status of transitions) {
    try {
      const patchRes = await fetch(`${BASE}/api/captain/orders/${orderId}`, {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const patchBody = await json(patchRes);
      if (!patchRes.ok || patchBody.order?.status !== status) {
        throw new Error(patchBody.error || `HTTP ${patchRes.status}`);
      }
      pass(`6. Transition → ${status}`);
    } catch (e) {
      fail(`6. Transition → ${status}`, String(e));
      break;
    }
  }

  try {
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderSource: true,
        status: true,
        acceptedAt: true,
        preparingAt: true,
        readyAt: true,
        servedAt: true,
      },
    });
    if (dbOrder?.orderSource !== "CAPTAIN" || dbOrder.status !== "SERVED") {
      throw new Error(JSON.stringify(dbOrder));
    }
    if (!dbOrder.acceptedAt || !dbOrder.preparingAt || !dbOrder.readyAt || !dbOrder.servedAt) {
      throw new Error("Missing timestamps");
    }
    pass("7. DB timestamps saved");
  } catch (e) {
    fail("7. DB timestamps saved", String(e));
  }

  try {
    const listRes = await fetch(`${BASE}/api/captain/orders?tableId=${table.id}`, {
      headers: { Cookie: cookie },
    });
    const listBody = await json(listRes);
    if (!listRes.ok || !Array.isArray(listBody.orders)) {
      throw new Error(listBody.error || `HTTP ${listRes.status}`);
    }
    pass("8. Captain list by table", `${listBody.orders.length} orders`);
  } catch (e) {
    fail("8. Captain list by table", String(e));
  }

  try {
    const pageRes = await fetch(`${BASE}/dashboard/captain`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    if (![200, 307, 308].includes(pageRes.status)) {
      throw new Error(`HTTP ${pageRes.status}`);
    }
    pass("9. Captain dashboard page");
  } catch (e) {
    fail("9. Captain dashboard page", String(e));
  }

  await cleanup(orderId);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
  process.exit(failed.length ? 1 : 0);
}

async function cleanup(orderId) {
  if (orderId) {
    await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
    await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
