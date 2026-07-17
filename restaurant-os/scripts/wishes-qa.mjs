/**
 * Wishes flow QA — public gate + staff dashboard + API
 * Usage: node scripts/wishes-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const SLUG = process.env.RESTAURANT_SLUG || "menu-os-demo";
const QR_MSG = "يرجى مسح رمز QR الموجود على طاولتك";

const results = [];
function pass(n, d = "") {
  results.push({ ok: true, n, d });
  console.log(`PASS  ${n}${d ? ` — ${d}` : ""}`);
}
function fail(n, d = "") {
  results.push({ ok: false, n, d });
  console.log(`FAIL  ${n}${d ? ` — ${d}` : ""}`);
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

async function main() {
  console.log(`\nWishes QA @ ${BASE}\n`);

  const wishesPage = `${BASE}/r/${SLUG}/wishes`;
  const pageRes = await fetch(wishesPage);
  const pageHtml = await pageRes.text();
  if (pageRes.ok && pageHtml.includes(QR_MSG)) {
    pass("Wishes page blocks without table session");
  } else {
    fail("Wishes page blocks without table session", `HTTP ${pageRes.status}`);
  }

  const postRes = await fetch(`${BASE}/api/public/wishes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableId: "invalid-table-id",
      type: "NOTE",
      message: "QA test wish",
    }),
  });
  const postData = await json(postRes);
  if (!postRes.ok && (postData.error || "").includes("QR")) {
    pass("Public wishes POST rejects invalid session");
  } else if (!postRes.ok) {
    pass("Public wishes POST rejects spoofed table", postData.error || `HTTP ${postRes.status}`);
  } else {
    fail("Public wishes POST rejects spoofed table", "accepted invalid request");
  }

  const getRes = await fetch(`${BASE}/api/public/wishes?tableId=invalid`);
  if (!getRes.ok) {
    pass("Public wishes GET rejects invalid table");
  } else {
    fail("Public wishes GET rejects invalid table");
  }

  let cookie = "";
  try {
    cookie = await login();
    pass("Staff login");
  } catch (e) {
    fail("Staff login", String(e.message));
    process.exit(1);
  }

  const dashRes = await fetch(`${BASE}/dashboard/wishes`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if ([200, 307, 302].includes(dashRes.status)) {
    pass("Wishes dashboard page", `HTTP ${dashRes.status}`);
  } else {
    fail("Wishes dashboard page", `HTTP ${dashRes.status}`);
  }

  const apiRes = await fetch(`${BASE}/api/wishes`, { headers: { Cookie: cookie } });
  if (apiRes.ok) {
    const data = await json(apiRes);
    pass("Staff wishes API", `count=${(data.wishes || []).length}`);
  } else {
    fail("Staff wishes API", `HTTP ${apiRes.status}`);
  }

  const settingsRes = await fetch(`${BASE}/api/restaurants/gift-settings`, {
    headers: { Cookie: cookie },
  });
  if (settingsRes.ok) {
    const data = await json(settingsRes);
    if (typeof data.settings?.wishesEnabled === "boolean") {
      pass("Owner wishes toggle in settings", `enabled=${data.settings.wishesEnabled}`);
    } else {
      fail("Owner wishes toggle in settings", "wishesEnabled missing");
    }
  } else {
    fail("Owner wishes toggle in settings", `HTTP ${settingsRes.status}`);
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n--- Wishes QA: ${ok}/${results.length} PASS ---\n`);
  process.exit(ok === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
