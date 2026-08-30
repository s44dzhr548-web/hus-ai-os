#!/usr/bin/env node
/** Final reservation validation — status flow, data integrity, no deploy */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import { PrismaClient } from "@prisma/client";
import { transitionReservationStatus } from "../src/lib/reservation-audit";

loadMigrateEnv();
const prisma = new PrismaClient();
const BASE = (process.argv[2] || "http://localhost:3005").replace(/\/$/, "");
const FABRIKA_SLUG = "fabrika-mqkat9dw";

type Snap = { id: string; restaurantId: string; tableId: string | null };
const report: Record<string, string> = {};

async function json(res: Response) {
  return res.json().catch(() => ({}));
}

function tomorrowIso(tz = "Asia/Riyadh") {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function pickSlot(slug: string, start: string) {
  const base = new Date(`${start}T12:00:00`);
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const data = await json(
      await fetch(`${BASE}/api/public/reservations/slots?slug=${slug}&date=${date}`)
    );
    const slot = (data.slots || []).find((s: { available: boolean }) => s.available);
    if (slot) return { date, time: slot.time as string };
  }
  return null;
}

async function main() {
  const fabrika = await prisma.restaurant.findFirst({
    where: { slug: FABRIKA_SLUG },
    select: { id: true, timezone: true },
  });
  if (!fabrika) throw new Error("Fabrika not found");

  const snapshot: Snap[] = await prisma.reservation.findMany({
    where: { restaurantId: fabrika.id },
    select: { id: true, restaurantId: true, tableId: true },
  });
  const countBefore = snapshot.length;

  const uiRes = await fetch(`${BASE}/r/${FABRIKA_SLUG}/reserve`);
  report["RESERVATION UI"] = uiRes.ok ? "PASS" : "FAIL";

  const picked = await pickSlot(FABRIKA_SLUG, tomorrowIso(fabrika.timezone || "Asia/Riyadh"));
  if (!picked) {
    report["NEW BOOKING"] = "FAIL";
    printReport();
    process.exit(1);
  }

  const create = await fetch(`${BASE}/api/public/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-idempotency-key": `final-${Date.now()}` },
    body: JSON.stringify({
      slug: FABRIKA_SLUG,
      customerName: "Final QA Guest",
      customerPhone: "0555551234",
      date: picked.date,
      time: picked.time,
      guestCount: 2,
    }),
  });
  const created = await json(create);
  report["NEW BOOKING"] = create.ok && created.publicToken ? "PASS" : "FAIL";
  report["WHATSAPP SAFE"] = create.ok ? "PASS" : "FAIL";

  const token = created.publicToken as string;
  const reservationId = created.id as string;

  const inDb = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurantId: fabrika.id, source: "public" },
  });
  report["RECEPTION SYNC"] = inDb ? "PASS" : "FAIL";

  let phase = (await json(await fetch(`${BASE}/api/public/reservations/${token}`))).reservation?.phase;
  const pendingOk = phase === "PENDING";

  await transitionReservationStatus(
    reservationId,
    fabrika.id,
    "APPROVED",
    { confirmedAt: new Date() },
    undefined,
    "final QA confirm"
  );
  phase = (await json(await fetch(`${BASE}/api/public/reservations/${token}`))).reservation?.phase;
  const confirmedOk = phase === "CONFIRMED";

  const table = await prisma.diningTable.findFirst({
    where: { branch: { restaurantId: fabrika.id }, isArchived: false },
    orderBy: { number: "asc" },
  });
  if (table) {
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
  }
  phase = (await json(await fetch(`${BASE}/api/public/reservations/${token}`))).reservation?.phase;
  const assignedOk = phase === "TABLE_ASSIGNED";

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "SEATED", seatedAt: new Date() },
  });
  phase = (await json(await fetch(`${BASE}/api/public/reservations/${token}`))).reservation?.phase;
  const seatedOk = phase === "SEATED";

  report["LIVE STATUS"] =
    pendingOk && confirmedOk && assignedOk && seatedOk ? "PASS" : "FAIL";

  const pendingBooking = await fetch(`${BASE}/api/public/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: FABRIKA_SLUG,
      customerName: "Edit QA",
      customerPhone: "0555559876",
      date: picked.date,
      time: picked.time,
      guestCount: 2,
    }),
  });
  const pendingData = await json(pendingBooking);
  const editToken = pendingData.publicToken as string;

  const editOk = editToken
    ? (await fetch(`${BASE}/api/public/reservations/${editToken}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", guestCount: 4 }),
      })).ok
    : false;
  report["EDIT BEFORE CONFIRM"] = editOk ? "PASS" : "FAIL";

  const lockRes = await fetch(`${BASE}/api/public/reservations/${token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", guestCount: 9 }),
  });
  const lockData = await json(lockRes);
  report["LOCK AFTER CONFIRM"] =
    lockRes.status === 409 || String(lockData.error || "").includes("تم تأكيد الحجز")
      ? "PASS"
      : "FAIL";

  const afterAssign = (await json(await fetch(`${BASE}/api/public/reservations/${token}`))).reservation;
  report["TABLE ASSIGNMENT"] =
    afterAssign?.tableNumber === table?.number && afterAssign?.tableNumber != null ? "PASS" : "FAIL";

  const countAfter = await prisma.reservation.count({ where: { restaurantId: fabrika.id } });
  let idsUnchanged = true;
  for (const row of snapshot) {
    const now = await prisma.reservation.findUnique({
      where: { id: row.id },
      select: { restaurantId: true, tableId: true },
    });
    if (!now || now.restaurantId !== row.restaurantId || now.tableId !== row.tableId) {
      idsUnchanged = false;
      break;
    }
  }
  report["OLD RESERVATIONS PRESERVED"] =
    countAfter >= countBefore && idsUnchanged ? "YES" : "NO";
  report["DATABASE SAFE"] = idsUnchanged && countAfter >= countBefore ? "YES" : "NO";

  printReport();
}

function printReport() {
  const keys = [
    "RESERVATION UI",
    "NEW BOOKING",
    "RECEPTION SYNC",
    "LIVE STATUS",
    "EDIT BEFORE CONFIRM",
    "LOCK AFTER CONFIRM",
    "TABLE ASSIGNMENT",
    "OLD RESERVATIONS PRESERVED",
    "DATABASE SAFE",
  ];
  for (const k of keys) console.log(`${k}: ${report[k] ?? "—"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
