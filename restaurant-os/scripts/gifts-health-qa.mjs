/**
 * Table Gifts + health QA
 * Usage: node scripts/gifts-health-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const results = [];
function pass(n, d = "") { results.push({ ok: true, n, d }); console.log(`PASS ${n}${d ? ` — ${d}` : ""}`); }
function fail(n, d = "") { results.push({ ok: false, n, d }); console.log(`FAIL ${n}${d ? ` — ${d}` : ""}`); }

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return res.status;
}

async function main() {
  console.log(`\nGifts + Health QA @ ${BASE}\n`);

  for (const [name, path] of [
    ["Reception", "/dashboard/reception"],
    ["Reservations", "/dashboard/reservations"],
    ["Customers", "/dashboard/customers"],
    ["Tables", "/dashboard/tables"],
    ["Gifts dashboard", "/dashboard/gifts"],
    ["Staff activity", "/dashboard/staff/activity"],
  ]) {
    const s = await get(path);
    if ([200, 307, 302].includes(s)) pass(`Page ${name}`, `HTTP ${s}`);
    else fail(`Page ${name}`, `HTTP ${s}`);
  }

  for (const [name, path] of [
    ["Reception API", "/api/reception"],
    ["Reservations API", "/api/reservations"],
    ["Customers API", "/api/customers"],
    ["Gifts admin API", "/api/gifts"],
    ["Gift settings API", "/api/restaurants/gift-settings"],
    ["Public gifts API", "/api/public/gifts?tableId=test"],
  ]) {
    const s = await get(path);
    if ([401, 403, 400, 404].includes(s) || s === 200) pass(`API ${name}`, `HTTP ${s}`);
    else fail(`API ${name}`, `HTTP ${s}`);
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n--- ${ok}/${results.length} PASS ---\n`);
  process.exit(ok === results.length ? 0 : 1);
}

main();
