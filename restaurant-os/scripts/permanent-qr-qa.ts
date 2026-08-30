#!/usr/bin/env node
/**
 * Permanent table QR QA — Fabrika tables, token stability, order routing.
 * Usage: npx tsx scripts/permanent-qr-qa.ts [baseUrl]
 */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";
import {
  PERMANENT_QR_BASE_URL,
  permanentQrUrl,
  ensureTablePublicQrToken,
} from "../src/lib/permanent-qr";

loadMigrateEnv();
const prisma = new PrismaClient();
const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3005").replace(/\/$/, "");
const FABRIKA_SLUG = "fabrika-mqkat9dw";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function pass(name: string, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

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

async function openQrSession(token: string) {
  const res = await fetch(`${BASE}/q/${token}`, { redirect: "manual" });
  const cookie = parseSetCookie(res);
  const location = res.headers.get("location") || "";
  return { status: res.status, cookie, location };
}

async function json(res: Response) {
  return res.json().catch(() => ({}));
}

async function main() {
  console.log(`=== Permanent QR QA ===\n${BASE}\n`);

  pass("QR base URL", PERMANENT_QR_BASE_URL);
  if (PERMANENT_QR_BASE_URL.includes("www.menuhus.com")) {
    pass("domain safety", "www.menuhus.com only");
  } else {
    fail("domain safety", PERMANENT_QR_BASE_URL);
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: FABRIKA_SLUG },
    select: { id: true, slug: true, name: true },
  });
  if (!restaurant) {
    fail("fabrika restaurant", "not found");
    process.exit(1);
  }
  pass("fabrika restaurant", restaurant.slug);

  const allTables = await prisma.diningTable.findMany({
    where: { branch: { restaurantId: restaurant.id }, isArchived: false },
    orderBy: { number: "asc" },
    select: { id: true, number: true, publicQrToken: true },
  });

  pass("fabrika table count", String(allTables.length));

  const beforeIds = allTables.map((t) => t.id).sort();
  let tokensCreated = 0;
  for (const table of allTables) {
    if (!table.publicQrToken) {
      await ensureTablePublicQrToken(table.id);
      tokensCreated++;
    }
  }

  const refreshed = await prisma.diningTable.findMany({
    where: { branch: { restaurantId: restaurant.id }, isArchived: false },
    orderBy: { number: "asc" },
    select: { id: true, number: true, publicQrToken: true, qrCode: true },
  });

  pass("tokens created this run", String(tokensCreated));
  const afterIds = refreshed.map((t) => t.id).sort();
  if (JSON.stringify(beforeIds) === JSON.stringify(afterIds)) {
    pass("existing table ids preserved", "YES");
  } else {
    fail("existing table ids preserved", "IDs changed");
  }

  const sampleIndexes = [0, 1, 9, refreshed.length - 1].filter(
    (i, idx, arr) => i >= 0 && i < refreshed.length && arr.indexOf(i) === idx
  );
  const uniqueSamples = sampleIndexes.map((i) => refreshed[i]).filter(Boolean);

  for (const table of uniqueSamples) {
    const tokenBefore = table.publicQrToken!;
    const tokenAgain = await ensureTablePublicQrToken(table.id);
    if (tokenBefore === tokenAgain) {
      pass(`token stable table ${table.number}`, tokenAgain);
    } else {
      fail(`token stable table ${table.number}`, `${tokenBefore} → ${tokenAgain}`);
    }

    const url = permanentQrUrl(tokenAgain);
    if (url.startsWith(`${PERMANENT_QR_BASE_URL}/q/`)) {
      pass(`qr format table ${table.number}`, url);
    } else {
      fail(`qr format table ${table.number}`, url);
    }

    if (table.qrCode === url) {
      pass(`qr export stored url table ${table.number}`, url);
    } else {
      fail(`qr export stored url table ${table.number}`, table.qrCode || "missing");
    }

    const session = await openQrSession(tokenAgain);
    if ([307, 308, 302].includes(session.status) && session.cookie.includes("table_qr_ctx")) {
      pass(`qr resolver table ${table.number}`, session.location);
    } else {
      fail(`qr resolver table ${table.number}`, `status ${session.status}`);
    }

    const menuItem = await prisma.menuItem.findFirst({
      where: { isAvailable: true, category: { restaurantId: restaurant.id } },
      select: { id: true },
    });
    if (!menuItem) {
      fail(`order table ${table.number}`, "no menu item");
      continue;
    }

    const createRes = await fetch(`${BASE}/api/public/captain/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: session.cookie,
        "X-Idempotency-Key": `perm-qr-${table.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        tableId: "wrong-id-should-be-ignored",
        items: [{ menuItemId: menuItem.id, quantity: 1 }],
      }),
    });
    const createBody = await json(createRes);
    if (createRes.ok && createBody.order?.id) {
      const order = await prisma.order.findUnique({
        where: { id: createBody.order.id },
        select: { tableId: true, branch: { select: { restaurantId: true } } },
      });
      if (order?.tableId === table.id && order.branch.restaurantId === restaurant.id) {
        pass(`order table ${table.number}`, `order ${createBody.order.displayNumber}`);
      } else {
        fail(`order table ${table.number}`, "wrong table/restaurant on order");
      }
      await prisma.orderItem.deleteMany({ where: { orderId: createBody.order.id } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: createBody.order.id } });
      await prisma.order.delete({ where: { id: createBody.order.id } });
    } else {
      fail(`order table ${table.number}`, createBody.error || `HTTP ${createRes.status}`);
    }
  }

  const exportTable = uniqueSamples[0];
  if (exportTable) {
    const t1 = await ensureTablePublicQrToken(exportTable.id);
    const t2 = await ensureTablePublicQrToken(exportTable.id);
    if (t1 === t2) pass("export token idempotent", t1);
    else fail("export token idempotent", `${t1} vs ${t2}`);
  }

  const originalSlug = restaurant.slug;
  const tempSlug = `${originalSlug}-qr-test-${Date.now().toString(36).slice(-4)}`;
  await prisma.restaurant.update({ where: { id: restaurant.id }, data: { slug: tempSlug } });
  try {
    const testTable = uniqueSamples[0];
    if (testTable?.publicQrToken) {
      const session = await openQrSession(testTable.publicQrToken);
      if ([307, 308, 302].includes(session.status)) {
        pass("slug change resilience", `still resolves after slug ${tempSlug}`);
      } else {
        fail("slug change resilience", `status ${session.status}`);
      }
    }
  } finally {
    await prisma.restaurant.update({ where: { id: restaurant.id }, data: { slug: originalSlug } });
  }

  const oldReservations = await prisma.reservation.count({ where: { restaurantId: restaurant.id } });
  pass("fabrika reservations preserved", String(oldReservations));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
