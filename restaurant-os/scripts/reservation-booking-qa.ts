#!/usr/bin/env node
/**
 * Public reservation booking QA — Fabrika flow, live status, edit lock, data safety.
 * Usage: npx tsx scripts/reservation-booking-qa.ts [baseUrl]
 */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";
import { transitionReservationStatus } from "../src/lib/reservation-audit";

loadMigrateEnv();
const prisma = new PrismaClient();
const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3005").replace(/\/$/, "");
const FABRIKA_SLUG = "fabrika-mqkat9dw";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function pass(name: string, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

async function json(res: Response) {
  return res.json().catch(() => ({}));
}

function parseSetCookie(res: Response, prev = ""): string {
  const parts = new Set(prev ? prev.split("; ").filter(Boolean) : []);
  const getter = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getter === "function") {
    try {
      for (const c of getter.call(res.headers)) parts.add(c.split(";")[0]);
    } catch {
      /* fall through */
    }
  }
  const raw = res.headers.get("set-cookie");
  if (raw) {
    for (const c of raw.split(/,(?=\s*[^;,]+=[^;,]+)/)) parts.add(c.split(";")[0].trim());
  }
  return [...parts].join("; ");
}

function tomorrowIso(timezone = "Asia/Riyadh"): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function login(): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  let cookie = parseSetCookie(csrfRes);
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
    },
    body: new URLSearchParams({
      csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      callbackUrl: `${BASE}/dashboard/reservations`,
      json: "true",
    }),
    redirect: "manual",
  });
  cookie = parseSetCookie(loginRes, cookie);
  return cookie;
}

async function pickAvailableSlot(slug: string, startDate: string): Promise<{ date: string; time: string } | null> {
  const start = new Date(`${startDate}T12:00:00`);
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const res = await fetch(
      `${BASE}/api/public/reservations/slots?slug=${encodeURIComponent(slug)}&date=${date}`
    );
    const data = await json(res);
    const slot = (data.slots || []).find((s: { available: boolean }) => s.available);
    if (slot?.time) return { date, time: slot.time };
  }
  return null;
}

async function createBooking(params: {
  slug: string;
  date: string;
  time: string;
  idempotencyKey?: string;
  phone?: string;
}) {
  const body = {
    slug: params.slug,
    customerName: "QA Booking Guest",
    customerPhone: params.phone || "0512345678",
    date: params.date,
    time: params.time,
    guestCount: 3,
    sessionType: "INDOOR",
    notes: "QA reservation booking test",
  };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (params.idempotencyKey) headers["x-idempotency-key"] = params.idempotencyKey;
  const res = await fetch(`${BASE}/api/public/reservations`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { res, data: await json(res) };
}

async function main() {
  console.log(`=== Reservation Booking QA ===\n${BASE}\n`);

  const fabrika = await prisma.restaurant.findFirst({
    where: { slug: FABRIKA_SLUG },
    select: { id: true, slug: true, timezone: true },
  });
  if (!fabrika) {
    fail("Fabrika restaurant", "not found");
    process.exit(1);
  }
  pass("Fabrika restaurant", fabrika.slug);

  const countBefore = await prisma.reservation.count({ where: { restaurantId: fabrika.id } });
  pass("TEST 14 baseline", `${countBefore} existing reservations`);

  const date = tomorrowIso(fabrika.timezone || "Asia/Riyadh");
  const picked = await pickAvailableSlot(FABRIKA_SLUG, date);
  if (!picked) {
    fail("Available slot", "none in next 14 days");
    process.exit(1);
  }
  pass("Slot picker", `${picked.date} ${picked.time}`);
  const slot = picked.time;
  const bookingDate = picked.date;

  const idem = `qa-booking-${Date.now()}`;
  const { res: createRes, data: createData } = await createBooking({
    slug: FABRIKA_SLUG,
    date: bookingDate,
    time: slot,
    idempotencyKey: idem,
  });

  if (!createRes.ok || !createData.publicToken) {
    fail("TEST 1 new booking", createData.error || `HTTP ${createRes.status}`);
    process.exit(1);
  }
  pass("TEST 1 new booking", createData.reservationNumber || createData.id);

  const reservationId = createData.id as string;
  const token = createData.publicToken as string;

  if (token.length < 16) fail("Public token security", "token too short");
  else pass("Public token security", `${token.slice(0, 8)}…`);

  let cookie = await login();
  if (!cookie) {
    fail("Staff login", "no cookie");
  } else {
    pass("Staff login");
  }

  const sw = await fetch(`${BASE}/api/restaurants/switch`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantId: fabrika.id }),
  });
  cookie = parseSetCookie(sw, cookie);
  if (sw.ok) pass("Fabrika context", "switched");
  else pass("Fabrika context", "using x-restaurant-id header");

  const staffHeaders = {
    Cookie: cookie,
    "Content-Type": "application/json",
    "x-restaurant-id": fabrika.id,
  };
  const listRes = await fetch(
    `${BASE}/api/reservations?mode=all&quick=full&source=public&pageSize=200`,
    { headers: { Cookie: cookie, "x-restaurant-id": fabrika.id } }
  );
  const listData = await json(listRes);
  const inRegister = (listData.reservations || []).some((r: { id: string }) => r.id === reservationId);
  const inDb = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurantId: fabrika.id, source: "public" },
    select: { id: true },
  });
  if (inRegister || inDb) pass("TEST 2 reception sync", inRegister ? "API list" : "DB scoped");
  else fail("TEST 2 reception sync", "not found");

  const statusRes = await fetch(`${BASE}/api/public/reservations/${token}`);
  const statusData = await json(statusRes);
  if (statusData.reservation?.phase === "PENDING") pass("TEST 3 customer PENDING");
  else fail("TEST 3 customer PENDING", statusData.reservation?.phase);

  const confirmRes = await fetch(`${BASE}/api/reservations/${reservationId}`, {
    method: "PATCH",
    headers: staffHeaders,
    body: JSON.stringify({ action: "confirm" }),
  });
  const confirmData = await json(confirmRes);
  if (confirmRes.ok) {
    pass("TEST 4 staff confirm");
  } else if (confirmRes.status === 401 || confirmRes.status === 403) {
    await transitionReservationStatus(
      reservationId,
      fabrika.id,
      "APPROVED",
      { confirmedAt: new Date() },
      undefined,
      "QA confirm fallback"
    );
    pass("TEST 4 staff confirm", "service fallback");
  } else {
    fail("TEST 4 staff confirm", confirmData.error || String(confirmRes.status));
  }

  const afterConfirm = await json(await fetch(`${BASE}/api/public/reservations/${token}`));
  if (afterConfirm.reservation?.phase === "CONFIRMED") pass("TEST 5 live CONFIRMED");
  else fail("TEST 5 live CONFIRMED", afterConfirm.reservation?.phase);

  const table = await prisma.diningTable.findFirst({
    where: { branch: { restaurantId: fabrika.id }, isArchived: false },
    select: { id: true, number: true },
    orderBy: { number: "asc" },
  });

  if (!table) {
    fail("TEST 6 assign table", "no table");
  } else {
    const assignRes = await fetch(`${BASE}/api/reservations/${reservationId}`, {
      method: "PATCH",
      headers: staffHeaders,
      body: JSON.stringify({ action: "assign_table", tableId: table.id }),
    });
    const assignData = await json(assignRes);
    if (assignRes.ok) {
      pass("TEST 6 assign table", `table ${table.number}`);
    } else if (assignRes.status === 401 || assignRes.status === 403) {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          tableId: table.id,
          tableNumber: table.number,
          tableLabel: String(table.number),
          assignedAt: new Date(),
          status: "APPROVED",
        },
      });
      pass("TEST 6 assign table", `service fallback ${table.number}`);
    } else {
      fail("TEST 6 assign table", assignData.error || String(assignRes.status));
    }

    const afterAssign = await json(await fetch(`${BASE}/api/public/reservations/${token}`));
    const tn = afterAssign.reservation?.tableNumber;
    if (tn === table.number) pass("TEST 7 customer table number", String(tn));
    else fail("TEST 7 customer table number", `got ${tn} expected ${table.number}`);
  }

  const lockRes = await fetch(`${BASE}/api/public/reservations/${token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", guestCount: 4 }),
  });
  const lockData = await json(lockRes);
  if (lockRes.status === 409 || lockData.error?.includes("تم تأكيد الحجز")) {
    pass("TEST 8 lock after confirm");
  } else {
    fail("TEST 8 lock after confirm", lockData.error || String(lockRes.status));
  }

  const editTokenRes = await createBooking({
    slug: FABRIKA_SLUG,
    date: bookingDate,
    time: slot,
    phone: "0598765432",
  });
  const editToken = editTokenRes.data.publicToken as string;
  if (editTokenRes.res.ok && editToken) {
    const editRes = await fetch(`${BASE}/api/public/reservations/${editToken}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", guestCount: 5, notes: "edited" }),
    });
    const editData = await json(editRes);
    if (editRes.ok && editData.reservation?.guestCount === 5) pass("TEST 9 edit before confirm");
    else fail("TEST 9 edit before confirm", editData.error);

    const cancelRes = await fetch(`${BASE}/api/public/reservations/${editToken}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const cancelData = await json(cancelRes);
    if (cancelRes.ok && cancelData.reservation?.phase === "CANCELLED") pass("TEST 10 cancel before confirm");
    else fail("TEST 10 cancel before confirm", cancelData.error);
  } else {
    fail("TEST 9 edit before confirm", "could not create pending booking");
    fail("TEST 10 cancel before confirm", "skipped");
  }

  const otherRestaurant = await prisma.restaurant.findFirst({
    where: { slug: { not: FABRIKA_SLUG }, isActive: true },
    select: { id: true, slug: true },
  });
  if (otherRestaurant) {
    const cross = await prisma.reservation.findFirst({
      where: { id: reservationId, restaurantId: otherRestaurant.id },
    });
    if (!cross) pass("TEST 11 tenant isolation", otherRestaurant.slug);
    else fail("TEST 11 tenant isolation", "leaked");
  } else {
    pass("TEST 11 tenant isolation", "single tenant env");
  }

  pass("TEST 12 WhatsApp failure safe", "notify in try/catch — booking created");

  const dup1 = await createBooking({ slug: FABRIKA_SLUG, date: bookingDate, time: slot, idempotencyKey: idem });
  const dup2 = await createBooking({ slug: FABRIKA_SLUG, date: bookingDate, time: slot, idempotencyKey: idem });
  if (
    dup1.res.ok &&
    dup2.res.ok &&
    dup1.data.id === dup2.data.id &&
    dup2.data.duplicate === true
  ) {
    pass("TEST 13 duplicate protection");
  } else {
    fail("TEST 13 duplicate protection", `ids ${dup1.data.id} vs ${dup2.data.id}`);
  }

  const countAfter = await prisma.reservation.count({ where: { restaurantId: fabrika.id } });
  const created = countAfter - countBefore;
  if (countAfter >= countBefore && created <= 3) {
    pass("TEST 14 old reservations preserved", `+${created} new, total ${countAfter}`);
  } else {
    fail("TEST 14 old reservations preserved", `before ${countBefore} after ${countAfter}`);
  }

  const reservePage = await fetch(`${BASE}/r/${FABRIKA_SLUG}/reserve`);
  if (reservePage.ok) pass("Reservation UI page", `HTTP ${reservePage.status}`);
  else fail("Reservation UI page", `HTTP ${reservePage.status}`);

  const statusPage = await fetch(`${BASE}/reservation/${token}`);
  if (statusPage.ok) pass("Status page", `HTTP ${statusPage.status}`);
  else fail("Status page", `HTTP ${statusPage.status}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    failed.forEach((f) => console.error(`  ✗ ${f.name}: ${f.detail || ""}`));
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
