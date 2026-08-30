#!/usr/bin/env node
/**
 * Production captain orders QA — creates one real order, transitions status, no deletes.
 * Usage: node scripts/captain-orders-prod-qa.mjs [baseUrl]
 */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";

const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

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
  console.log(`=== Captain Production QA ===\n${BASE}\n`);

  const captainPage = await fetch(`${BASE}/dashboard/captain`, { redirect: "manual" });
  if (![200, 307, 308].includes(captainPage.status)) {
    fail("0. Captain route deployed", `HTTP ${captainPage.status}`);
  } else {
    pass("0. Captain route deployed", `HTTP ${captainPage.status}`);
  }

  let table = null;
  let menuItem = null;
  try {
    table = await prisma.diningTable.findFirst({
      where: { number: 12, isActive: true },
      include: { branch: { select: { restaurantId: true, restaurant: { select: { slug: true } } } } },
    });
    if (!table) {
      table = await prisma.diningTable.findFirst({
        where: { isActive: true },
        include: { branch: { select: { restaurantId: true, restaurant: { select: { slug: true } } } } },
      });
    }
    menuItem = await prisma.menuItem.findFirst({
      where: { isAvailable: true, category: { restaurantId: table.branch.restaurantId } },
      select: { id: true, name: true },
    });
    pass("1. Fixtures", `table ${table.number}, item ${menuItem.name}`);
  } catch (e) {
    fail("1. Fixtures", String(e));
    await prisma.$disconnect();
    process.exit(1);
  }

  const menuUrl = `${BASE}/menu/${table.id}`;
  const menuRes = await fetch(menuUrl, { redirect: "manual" });
  if (![200, 307, 308].includes(menuRes.status)) {
    fail("2. Menu QR page", `HTTP ${menuRes.status} ${menuUrl}`);
  } else {
    pass("2. Menu QR page", menuUrl);
  }

  const idempotencyKey = `prod-cap-qa-${Date.now()}`;
  let orderId = null;
  try {
    const createRes = await fetch(`${BASE}/api/public/captain/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        tableId: table.id,
        notes: "Production captain QA — safe test order",
        items: [{ menuItemId: menuItem.id, quantity: 1, notes: "QA item note" }],
      }),
    });
    const body = await json(createRes);
    if (!createRes.ok || !body.order?.id) throw new Error(body.error || `HTTP ${createRes.status}`);
    orderId = body.order.id;
    pass("3. Create order", `${body.order.displayNumber} (${orderId})`);
  } catch (e) {
    fail("3. Create order", String(e));
    await prisma.$disconnect();
    process.exit(1);
  }

  const statusUrl = `${BASE}/order-status/${orderId}?captain=1`;
  const statusPage = await fetch(statusUrl, { redirect: "manual" });
  if (![200, 307, 308].includes(statusPage.status)) {
    fail("4. Customer status page", `HTTP ${statusPage.status}`);
  } else {
    pass("4. Customer status page", statusUrl);
  }

  let cookie = "";
  try {
    cookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    pass("5. Captain login");
  } catch (e) {
    fail("5. Captain login", String(e));
    await prisma.$disconnect();
    process.exit(1);
  }

  try {
    const listRes = await fetch(`${BASE}/api/captain/orders?filter=new`, {
      headers: { Cookie: cookie },
    });
    const listBody = await json(listRes);
    if (!listRes.ok) throw new Error(listBody.error || `HTTP ${listRes.status}`);
    const found = (listBody.orders || []).some((o) => o.id === orderId);
    if (!found) throw new Error("order not in captain list");
    pass("6. Order visible in captain API", listBody.orders.length + " NEW orders");
  } catch (e) {
    fail("6. Order visible in captain API", String(e));
  }

  for (const status of ["ACCEPTED", "PREPARING", "READY", "SERVED"]) {
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
      pass(`7. Captain → ${status}`);
    } catch (e) {
      fail(`7. Captain → ${status}`, String(e));
      break;
    }
  }

  try {
    const pubRes = await fetch(`${BASE}/api/public/captain/orders/${orderId}`);
    const pubBody = await json(pubRes);
    if (!pubRes.ok || pubBody.status !== "SERVED") {
      throw new Error(pubBody.error || `status ${pubBody.status}`);
    }
    pass("8. Customer API shows SERVED");
  } catch (e) {
    fail("8. Customer API shows SERVED", String(e));
  }

  console.log(`\nOrder left in DB for audit: ${orderId} (not deleted)`);
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
