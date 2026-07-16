#!/usr/bin/env node
/**
 * Reservation register persistent QA
 */
const BASE = process.argv[2] || process.env.QA_BASE_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

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
  console.log(`\n=== Reservation Register QA ===\nURL: ${BASE}\n`);
  const cookie = await login();
  record("Login", !!cookie);
  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const countBefore = await json(
    await fetch(`${BASE}/api/reservations?mode=all&quick=full&pageSize=1`, { headers })
  );
  const totalBefore = countBefore.pagination?.total ?? 0;
  record("Reservation count baseline", totalBefore >= 0, `total=${totalBefore}`);

  const active = await json(
    await fetch(`${BASE}/api/reservations?mode=active&quick=upcoming`, { headers })
  );
  record("Active register API", Array.isArray(active.reservations));
  record("Stats payload", !!active.stats && "today" in active.stats);
  record("Pagination", !!active.pagination);

  const history = await json(
    await fetch(`${BASE}/api/reservations?mode=history&quick=full`, { headers })
  );
  record("History API", Array.isArray(history.reservations));

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
  if (id) {
    await fetch(`${BASE}/api/reservations/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "confirm" }),
    });
    const confirmed = await json(
      await fetch(`${BASE}/api/reservations/${id}`, { headers })
    );
    record("Confirm + detail API", !!confirmed.reservation);
    record("Status history table", Array.isArray(confirmed.statusHistory));

    const tables = await json(await fetch(`${BASE}/api/tables`, { headers }));
    const tableList = Array.isArray(tables) ? tables : tables.tables || [];
    const table = tableList[0];
    if (table) {
      await fetch(`${BASE}/api/reservations/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "mark_arrived" }),
      });
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
      record("Seat flow", !!seat.session || seat.reservation?.status === "SEATED");
      if (seat.session?.id) {
        await fetch(`${BASE}/api/reception/${seat.session.id}`, { method: "DELETE", headers });
      }
      const completed = await json(await fetch(`${BASE}/api/reservations/${id}`, { headers }));
      record("Completed moves to history status", completed.reservation?.status === "COMPLETED");
      const histSearch = await json(
        await fetch(`${BASE}/api/reservations?mode=history&q=${encodeURIComponent(created.reservationNumber)}`, {
          headers,
        })
      );
      record(
        "Searchable in history by number",
        (histSearch.reservations || []).some((r) => r.id === id)
      );
    }
  }

  const countAfter = await json(
    await fetch(`${BASE}/api/reservations?mode=all&quick=full&pageSize=1`, { headers })
  );
  const totalAfter = countAfter.pagination?.total ?? 0;
  record("Count did not decrease", totalAfter >= totalBefore, `before=${totalBefore} after=${totalAfter}`);

  const page = await fetch(`${BASE}/dashboard/reservations`, { headers });
  record("Reservations page", page.status === 200);
  const histPage = await fetch(`${BASE}/dashboard/reservations/history`, { headers });
  record("History page", histPage.status === 200);

  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n--- Reservation Register QA: ${fail === 0 ? "PASS" : "FAIL"} (${results.length - fail}/${results.length})`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
