/**
 * Table Gifts + health QA
 * Usage: node scripts/gifts-health-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const SLUG = process.env.RESTAURANT_SLUG || "menu-os-demo";
const QR_MSG = "يرجى مسح رمز QR";

const results = [];
function pass(n, d = "") { results.push({ ok: true, n, d }); console.log(`PASS ${n}${d ? ` — ${d}` : ""}`); }
function fail(n, d = "") { results.push({ ok: false, n, d }); console.log(`FAIL ${n}${d ? ` — ${d}` : ""}`); }

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
      email: process.env.QA_ADMIN_EMAIL || "admin@menuos.sa",
      password: process.env.QA_ADMIN_PASSWORD || "admin123456",
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

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return res.status;
}

async function main() {
  console.log(`\nGifts + Health QA @ ${BASE}\n`);

  const giftsGate = await fetch(`${BASE}/r/${SLUG}/gifts`);
  const giftsHtml = await giftsGate.text();
  if (giftsGate.ok && giftsHtml.includes(QR_MSG)) {
    pass("Gifts session gate");
  } else {
    fail("Gifts session gate", `HTTP ${giftsGate.status}`);
  }

  for (const [name, path] of [
    ["Reception", "/dashboard/reception"],
    ["Reservations", "/dashboard/reservations"],
    ["Customers", "/dashboard/customers"],
    ["Tables", "/dashboard/tables"],
    ["Gifts dashboard", "/dashboard/gifts"],
    ["Wishes dashboard", "/dashboard/wishes"],
    ["Song requests dashboard", "/dashboard/song-requests"],
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
    ["Wishes admin API", "/api/wishes"],
    ["Song requests admin API", "/api/song-requests"],
    ["Gift settings API", "/api/restaurants/gift-settings"],
    ["Public gifts API", "/api/public/gifts?tableId=test"],
    ["Public wishes API", "/api/public/wishes?tableId=test"],
    ["Public song requests API", "/api/public/song-requests?tableId=test"],
  ]) {
    const s = await get(path);
    if ([401, 403, 400, 404].includes(s) || s === 200) pass(`API ${name}`, `HTTP ${s}`);
    else fail(`API ${name}`, `HTTP ${s}`);
  }

  let cookie = "";
  try {
    cookie = await login();
    const settingsRes = await fetch(`${BASE}/api/restaurants/gift-settings`, {
      headers: { Cookie: cookie },
    });
    if (settingsRes.ok) {
      const data = await json(settingsRes);
      const s = data.settings || {};
      if (typeof s.enabled === "boolean") pass("Owner gift toggle", `enabled=${s.enabled}`);
      else fail("Owner gift toggle");
      if (typeof s.wishesEnabled === "boolean") pass("Owner wishes toggle", `enabled=${s.wishesEnabled}`);
      else fail("Owner wishes toggle");
      if (typeof s.songRequestsEnabled === "boolean") pass("Owner song toggle", `enabled=${s.songRequestsEnabled}`);
      else fail("Owner song toggle");

      const giftsRes = await fetch(`${BASE}/api/gifts`, { headers: { Cookie: cookie } });
      if (giftsRes.ok) {
        const giftsData = await json(giftsRes);
        pass("Staff gifts queue API", `count=${(giftsData.gifts || []).length}`);
      } else {
        fail("Staff gifts queue API", `HTTP ${giftsRes.status}`);
      }
    } else {
      fail("Owner settings API", `HTTP ${settingsRes.status}`);
    }
  } catch (e) {
    fail("Authenticated settings check", String(e.message));
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n--- ${ok}/${results.length} PASS ---\n`);
  process.exit(ok === results.length ? 0 : 1);
}

main();
