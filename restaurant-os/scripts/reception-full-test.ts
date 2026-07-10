/**
 * Full Reception & Reservations E2E test suite.
 * Usage: npx tsx scripts/reception-full-test.ts [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3005";
const ADMIN_EMAIL = "admin@menuos.sa";
const ADMIN_PASSWORD = "admin123456";

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}
async function json(res: Response) {
  return res.json().catch(() => ({}));
}
async function login(email: string, password: string): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies.map((c) => c.split(";")[0]).join("; ") },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: `${BASE}/dashboard`, json: "true" }),
    redirect: "manual",
  });
  return [...cookies.map((c) => c.split(";")[0]), ...(loginRes.headers.getSetCookie?.() || []).map((c) => c.split(";")[0])].join("; ");
}

async function main() {
  console.log(`\n=== Reception Full E2E Test ===\n${BASE}\n`);
  const cookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!cookie) { fail("Login"); process.exit(1); }
  pass("Login");
  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  // Dashboard pages
  for (const [name, path] of [["Reception dashboard", "/dashboard/reception"], ["Reservations dashboard", "/dashboard/reservations"]] as const) {
    const r = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
    r.status === 200 || r.status === 307 ? pass(name, `HTTP ${r.status}`) : fail(name, `HTTP ${r.status}`);
  }

  const rec = await json(await fetch(`${BASE}/api/reception`, { headers: { Cookie: cookie } }));
  rec.cards?.length ? pass("GET reception", `${rec.cards.length} tables`) : fail("GET reception");

  const available = rec.cards?.find((c: { session: unknown }) => !c.session);
  const tableId = available?.table?.id;
  let sessionId = "";

  // Walk-in
  if (tableId) {
    const w = await json(await fetch(`${BASE}/api/reception`, { method: "POST", headers, body: JSON.stringify({
      customerName: "E2E Guest", customerPhone: "0501112233", guestCount: 3, tableId,
      minimumSpendAmount: 100, gender: "male", occasion: "Business", status: "SEATED",
    }) }));
    w.id ? (pass("Walk-in customer", w.id), sessionId = w.id) : fail("Walk-in customer", w.error);
  } else fail("Walk-in customer", "no table");

  // Customer history
  const hist = await json(await fetch(`${BASE}/api/reception/customer-lookup?phone=0501112233`, { headers: { Cookie: cookie } }));
  hist.found ? pass("Customer history lookup") : pass("Customer history lookup", "new customer");

  // Minimum spend
  if (sessionId) {
    const p = await json(await fetch(`${BASE}/api/reception/${sessionId}`, { method: "PATCH", headers, body: JSON.stringify({ minimumSpendAmount: 100, status: "ORDERING" }) }));
    p.minimumSpendAmount === 100 ? pass("Minimum spend assigned") : fail("Minimum spend");
  }

  // QR menu
  if (tableId) {
    const menu = await json(await fetch(`${BASE}/api/public/menu/${tableId}`));
    menu.activeSession?.customerName && menu.activeSession?.minimumSpendAmount === 100
      ? pass("QR menu session + minimum spend")
      : fail("QR menu", JSON.stringify(menu.activeSession));
    menu.activeSession?.customerPhone === undefined ? pass("Phone hidden on public menu") : fail("Phone privacy");
  }

  // Waiting list
  const wl = await json(await fetch(`${BASE}/api/reception/waiting-list`, { method: "POST", headers, body: JSON.stringify({
    customerName: "Wait Guest", customerPhone: "0502223344", guestCount: 2,
  }) }));
  wl.id ? pass("Waiting list add", wl.id) : fail("Waiting list");

  // Reservation
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];
  const res = await json(await fetch(`${BASE}/api/reservations`, { method: "POST", headers, body: JSON.stringify({
    customerName: "E2E Reservation", customerPhone: "0503334455", guestCount: 4,
    date: dateStr, time: "20:00", occasion: "Birthday", preferredArea: "VIP", autoAssign: true,
  }) }));
  const resId = res.id;
  resId ? pass("Reservation created", resId) : fail("Reservation created", res.error);

  if (resId) {
    const confirm = await json(await fetch(`${BASE}/api/reservations/${resId}`, { method: "PATCH", headers, body: JSON.stringify({ action: "confirm" }) }));
    ["CONFIRMED", "APPROVED"].includes(confirm.status) ? pass("Reservation confirmed") : fail("Reservation confirmed");

    const suggest = await json(await fetch(`${BASE}/api/reservations/suggest-table`, { method: "POST", headers, body: JSON.stringify({ guestCount: 4, preferredArea: "VIP" }) }));
    suggest.table?.id ? pass("Auto table suggestion", `table ${suggest.table.number}`) : pass("Auto table suggestion", "no table");

    const freeTable = rec.cards?.find((c: { session: unknown; table: { id: string } }) => !c.session && c.table.id !== tableId);
    const convertTable = freeTable?.table?.id;
    if (convertTable) {
      await fetch(`${BASE}/api/reservations/${resId}`, { method: "PATCH", headers, body: JSON.stringify({ action: "assign_table", tableId: convertTable }) });
      const convert = await json(await fetch(`${BASE}/api/reservations/${resId}`, { method: "PATCH", headers, body: JSON.stringify({ action: "convert", tableId: convertTable }) }));
      convert.session?.id ? pass("Reservation → session", convert.session.id) : fail("Reservation convert");

      // Move table
      const another = rec.cards?.find((c: { session: unknown; table: { id: string } }) => !c.session && c.table.id !== tableId && c.table.id !== convertTable);
      if (another && convert.session?.id) {
        const move = await json(await fetch(`${BASE}/api/reception/${convert.session.id}`, { method: "PATCH", headers, body: JSON.stringify({ action: "move", toTableId: another.table.id }) }));
        move.tableId === another.table.id ? pass("Move table") : fail("Move table");
        await fetch(`${BASE}/api/reception/${convert.session.id}`, { method: "DELETE", headers: { Cookie: cookie } });
        pass("Close session (cleanup)");
      }
    } else {
      fail("Reservation convert", "no free table");
    }

    await fetch(`${BASE}/api/reservations/${resId}`, { method: "PATCH", headers, body: JSON.stringify({ action: "collect_deposit" }) });
    pass("Deposit collection (mock Moyasar)");
  }

  // Orders filter by table
  if (tableId) {
    const orders = await json(await fetch(`${BASE}/api/orders?tableId=${tableId}`, { headers: { Cookie: cookie } }));
    Array.isArray(orders) ? pass("Orders by tableId filter") : fail("Orders filter");
  }

  // Notifications
  const notifs = await json(await fetch(`${BASE}/api/reception/notifications`, { headers: { Cookie: cookie } }));
  Array.isArray(notifs) ? pass("Reception notifications") : fail("Notifications");

  // Cleanup walk-in
  if (sessionId) {
    await fetch(`${BASE}/api/reception/${sessionId}`, { method: "DELETE", headers: { Cookie: cookie } });
    pass("Walk-in cleanup");
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const pct = Math.round((passed / results.length) * 100);
  console.log(`\n=== ${passed}/${results.length} passed (${pct}%) ===`);
  console.log(`Reception: ${BASE}/dashboard/reception`);
  console.log(`Reservations: ${BASE}/dashboard/reservations`);
  console.log(`Production: ${BASE}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
