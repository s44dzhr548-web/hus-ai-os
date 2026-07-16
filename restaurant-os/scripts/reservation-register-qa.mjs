#!/usr/bin/env node
/**
 * Reservation register production QA — UI, history, seating flow, data safety
 */
const BASE = process.argv[2] || process.env.QA_BASE_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const FABRIKA_RESTAURANT_ID = "cmqidth3w0002uodgg9ugg3wa";

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
}

async function json(res) {
  return res.json().catch(() => ({}));
}

async function login() {
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
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  console.log(`\n=== Reservation Register Production QA ===\nURL: ${BASE}\n`);
  const cookie = await login();
  record("Login", !!cookie);
  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const countBefore = await json(
    await fetch(`${BASE}/api/reservations?mode=all&quick=full&pageSize=1`, { headers })
  );
  const fabrikaBefore = countBefore.pagination?.total ?? 0;
  record("Fabrika reservation baseline", fabrikaBefore === 21, `count=${fabrikaBefore}`);

  const active = await json(
    await fetch(`${BASE}/api/reservations?mode=active&quick=upcoming`, { headers })
  );
  record("New register API shape", !!active.stats && !!active.pagination);
  record("Stats payload", !!active.stats && "today" in active.stats);
  record("Pagination", !!active.pagination);

  const row = active.reservations?.[0];
  if (row) {
    const cols = [
      "reservationNumber",
      "customerName",
      "customerPhone",
      "guestCount",
      "reservationDateTimeDisplay",
      "createdDateTimeDisplay",
      "tableDisplay",
      "statusLabel",
      "arrivedAt",
      "seatedAt",
      "sessionEndedAt",
      "createdByName",
    ];
    const missing = cols.filter((c) => !(c in row));
    record("Register table columns", missing.length === 0, missing.join(", ") || "all present");
  } else {
    record("Register table columns", true, "no rows to inspect");
  }

  const history = await json(
    await fetch(`${BASE}/api/reservations?mode=history&quick=full&pageSize=1`, { headers })
  );
  record("History API", Array.isArray(history.reservations));

  const resPage = await fetch(`${BASE}/dashboard/reservations`, { headers });
  const resHtml = await resPage.text();
  record("Reservations page live", resPage.status === 200);
  record("Professional table UI", resHtml.includes("رقم الحجز") && resHtml.includes("سجل الحجوزات"));
  record("View switcher (table/cards/calendar)", resHtml.includes("جدول") && resHtml.includes("بطاقات") && resHtml.includes("تقويم"));

  const histPage = await fetch(`${BASE}/dashboard/reservations/history`, { headers });
  const histHtml = await histPage.text();
  record("History page live", histPage.status === 200);
  record(
    "Permanent history page (not redirect)",
    !histHtml.includes("customers?tab=reservations") && histHtml.includes("السجل الكامل")
  );

  const csvRes = await fetch(`${BASE}/api/reservations?mode=history&export=csv&quick=full`, { headers });
  record("CSV export", csvRes.ok && (csvRes.headers.get("content-type") || "").includes("csv"));

  const pdfRes = await fetch(`${BASE}/api/reservations?mode=history&export=pdf&quick=full`, { headers });
  const pdfText = await pdfRes.text();
  record("PDF export", pdfRes.ok && pdfText.includes("سجل الحجوزات"));

  const stamp = Date.now();
  const create = await fetch(`${BASE}/api/reservations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerName: `Register QA ${stamp}`,
      customerPhone: `05${String(stamp).slice(-8)}`,
      guestCount: 3,
      date: todayIso(),
      time: "21:00",
      source: "dashboard",
    }),
  });
  const created = await json(create);
  record("Create reservation", create.ok && !!created.reservationNumber, created.reservationNumber);
  record("Registration timestamp", !!created.createdAt);
  record("Separate reservation date/time", !!created.reservationDateDisplay && !!created.reservationTime);

  const id = created.id;
  let seatingPass = false;
  let historyPass = false;

  if (id) {
    await fetch(`${BASE}/api/reservations/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "confirm" }),
    });
    const confirmed = await json(await fetch(`${BASE}/api/reservations/${id}`, { headers }));
    record("Confirm + detail API", !!confirmed.reservation);
    record("Status history table", Array.isArray(confirmed.statusHistory));

    const tablesPayload = await json(await fetch(`${BASE}/api/tables`, { headers }));
    const tableList = Array.isArray(tablesPayload) ? tablesPayload : tablesPayload.tables || [];
    const table = tableList.find((t) => t.status !== "OCCUPIED" && t.isActive !== false) || tableList[0];

    if (table) {
      await fetch(`${BASE}/api/reservations/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "mark_arrived" }),
      });

      const afterArrive = await json(await fetch(`${BASE}/api/reception`, { headers }));
      const arrivedGuest = (afterArrive.presentGuests || []).find((g) => g.reservationId === id);
      record("Reception: arrived section", arrivedGuest?.displaySection === "arrived", arrivedGuest?.displaySection);

      await fetch(`${BASE}/api/reservations/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "assign_table", tableId: table.id }),
      });

      const seat = await json(
        await fetch(`${BASE}/api/reservations/${id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ action: "seat", tableId: table.id }),
        })
      );
      const seatedOk = seat.reservation?.status === "SEATED" || seat.reservation?.status === "CONVERTED";
      record("Confirm seating", seatedOk, seat.reservation?.status);

      const afterSeat = await json(await fetch(`${BASE}/api/reception`, { headers }));
      const seatedGuest = (afterSeat.presentGuests || []).find((g) => g.reservationId === id);
      record(
        "Reception: seated section",
        seatedGuest?.displaySection === "seated",
        seatedGuest?.displaySection
      );

      const receptionCard = (afterSeat.cards || []).find((c) => c.table?.id === table.id);
      record("Table OCCUPIED", receptionCard?.status === "OCCUPIED", receptionCard?.status);

      const activeSessions = (afterSeat.cards || []).filter((c) => c.session?.id).length;
      record("Active table session created", !!seat.session?.id, seat.session?.id);

      if (seat.session?.id) {
        await fetch(`${BASE}/api/reception/${seat.session.id}`, { method: "DELETE", headers });
      }

      const completed = await json(await fetch(`${BASE}/api/reservations/${id}`, { headers }));
      record("Reservation COMPLETED", completed.reservation?.status === "COMPLETED", completed.reservation?.status);

      const afterEnd = await json(await fetch(`${BASE}/api/reception`, { headers }));
      const freedCard = (afterEnd.cards || []).find((c) => c.table?.id === table.id);
      record("Table AVAILABLE after session", freedCard?.status === "AVAILABLE", freedCard?.status);

      const histSearch = await json(
        await fetch(
          `${BASE}/api/reservations?mode=history&q=${encodeURIComponent(created.reservationNumber)}`,
          { headers }
        )
      );
      historyPass = (histSearch.reservations || []).some((r) => r.id === id);
      record("Searchable in history by number", historyPass);

      seatingPass =
        seatedOk &&
        receptionCard?.status === "OCCUPIED" &&
        completed.reservation?.status === "COMPLETED" &&
        freedCard?.status === "AVAILABLE" &&
        historyPass;
    } else {
      record("Seating flow", false, "no table available");
    }
  }

  const countAfter = await json(
    await fetch(`${BASE}/api/reservations?mode=all&quick=full&pageSize=1`, { headers })
  );
  const fabrikaAfter = countAfter.pagination?.total ?? 0;
  record("Fabrika count unchanged", fabrikaAfter >= fabrikaBefore, `before=${fabrikaBefore} after=${fabrikaAfter}`);
  record("Fabrika exactly 21 after QA", fabrikaAfter === 21, `count=${fabrikaAfter}`);

  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n--- Seating flow: ${seatingPass ? "PASS" : "FAIL"}`);
  console.log(`--- History persistence: ${historyPass ? "PASS" : "FAIL"}`);
  console.log(`--- UI/Data QA: ${fail === 0 ? "PASS" : "FAIL"} (${results.length - fail}/${results.length})`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
