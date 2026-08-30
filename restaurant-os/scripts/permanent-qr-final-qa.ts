#!/usr/bin/env node
/** Final Fabrika QR validation for tables 1, 2, 10, last + export idempotency */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";
import {
  PERMANENT_QR_BASE_URL,
  permanentQrUrl,
  ensureTablePublicQrToken,
} from "../src/lib/permanent-qr";

loadMigrateEnv();
const prisma = new PrismaClient();
const BASE = (process.argv[2] || "http://localhost:3005").replace(/\/$/, "");
const SLUG = "fabrika-mqkat9dw";

function parseSetCookie(res: Response) {
  const getter = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getter === "function") {
    try {
      return getter.call(res.headers).map((c) => c.split(";")[0]).join("; ");
    } catch {
      /* fall through */
    }
  }
  const raw = res.headers.get("set-cookie");
  if (!raw) return "";
  return raw.split(/,(?=\s*[^;,]+=[^;,]+)/).map((c) => c.split(";")[0].trim()).join("; ");
}

async function testTable(table: { id: string; number: number; publicQrToken: string | null; qrCode: string | null }, restaurantId: string) {
  const beforeId = table.id;
  const t1 = await ensureTablePublicQrToken(table.id);
  const t2 = await ensureTablePublicQrToken(table.id);
  const url1 = permanentQrUrl(t1);
  const url2 = permanentQrUrl(t2);
  const exportOk = t1 === t2 && url1 === url2 && url1 === `https://www.menuhus.com/q/${t1}`;

  const res = await fetch(`${BASE}/q/${t1}`, { redirect: "manual" });
  const cookie = parseSetCookie(res);
  const resolverOk = [307, 308, 302].includes(res.status) && cookie.includes("table_qr_ctx");

  let orderOk = false;
  if (resolverOk) {
    const item = await prisma.menuItem.findFirst({
      where: { isAvailable: true, category: { restaurantId } },
      select: { id: true },
    });
    if (item) {
      const create = await fetch(`${BASE}/api/public/captain/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie, "X-Idempotency-Key": `final-qr-${table.id}-${Date.now()}` },
        body: JSON.stringify({ items: [{ menuItemId: item.id, quantity: 1 }] }),
      });
      const body = await create.json().catch(() => ({}));
      if (create.ok && body.order?.id) {
        const order = await prisma.order.findUnique({
          where: { id: body.order.id },
          select: { tableId: true, branch: { select: { restaurantId: true } } },
        });
        orderOk = order?.tableId === table.id && order.branch.restaurantId === restaurantId;
        await prisma.orderItem.deleteMany({ where: { orderId: body.order.id } });
        await prisma.orderStatusHistory.deleteMany({ where: { orderId: body.order.id } });
        await prisma.order.delete({ where: { id: body.order.id } });
      }
    }
  }

  const after = await prisma.diningTable.findUnique({ where: { id: beforeId }, select: { id: true, publicQrToken: true } });
  const idOk = after?.id === beforeId && after.publicQrToken === t1;

  return {
    number: table.number,
    token: t1,
    url: url1,
    exportOk,
    resolverOk,
    orderOk,
    idOk,
    ok: exportOk && resolverOk && orderOk && idOk,
  };
}

async function main() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: SLUG },
    select: { id: true },
  });
  if (!restaurant) {
    console.log(JSON.stringify({ error: "fabrika not found" }));
    process.exit(1);
  }

  const reservationsBefore = await prisma.reservation.count({ where: { restaurantId: restaurant.id } });
  const ordersBefore = await prisma.order.count({ where: { branch: { restaurantId: restaurant.id } } });
  const allTables = await prisma.diningTable.findMany({
    where: { branch: { restaurantId: restaurant.id }, isArchived: false },
    orderBy: { number: "asc" },
    select: { id: true, number: true, publicQrToken: true, qrCode: true },
  });
  const idsBefore = allTables.map((t) => t.id).sort();

  const targets = [1, 2, 10].map((n) => allTables.find((t) => t.number === n) || null);
  const last = allTables[allTables.length - 1] || null;

  const results: Record<string, unknown> = {
    fabrikaTableCount: allTables.length,
    tokensCreated: allTables.filter((t) => !t.publicQrToken).length,
    table1: targets[0] ? await testTable(targets[0], restaurant.id) : { ok: false, missing: true },
    table2: targets[1] ? await testTable(targets[1], restaurant.id) : { ok: false, missing: true },
    table10: targets[2] ? await testTable(targets[2], restaurant.id) : { ok: false, missing: true },
    lastTable: last ? await testTable(last, restaurant.id) : { ok: false, missing: true },
  };

  const idsAfter = (await prisma.diningTable.findMany({
    where: { branch: { restaurantId: restaurant.id }, isArchived: false },
    select: { id: true },
  })).map((t) => t.id).sort();

  results.reservationsPreserved = (await prisma.reservation.count({ where: { restaurantId: restaurant.id } })) === reservationsBefore;
  results.ordersPreserved = (await prisma.order.count({ where: { branch: { restaurantId: restaurant.id } } })) === ordersBefore;
  results.tableIdsPreserved = JSON.stringify(idsBefore) === JSON.stringify(idsAfter);
  results.permanentBaseUrl = PERMANENT_QR_BASE_URL;

  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
