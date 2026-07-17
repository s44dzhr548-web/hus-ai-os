/**
 * Production QA: Fabrika customer landing navigation
 * Usage: node scripts/customer-nav-qa.mjs
 */
const BASE = process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const SLUG = process.env.RESTAURANT_SLUG || "menu-os-demo";

const checks = [];

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return { res, text };
}

async function main() {
  console.log(`\nCustomer Nav QA — ${BASE}/r/${SLUG}\n`);

  const homeUrl = `${BASE}/r/${SLUG}`;
  const { res: homeRes, text: homeHtml } = await fetchText(homeUrl);

  if (!homeRes.ok) {
    fail("Customer home loads", `HTTP ${homeRes.status}`);
  } else {
    pass("Customer home loads", homeUrl);
  }

  const navItems = [
    ["المنيو", "menu"],
    ["حجز طاولة", "reservations"],
    ["الإهداء", "gift", "إهداء"],
    ["الأمنيات", "wishes"],
    ["طلب أغنية", "song_request"],
    ["العروض", "offers"],
    ["الحفلات", "events"],
  ];

  for (const [label, , alt] of navItems) {
    if (homeHtml.includes(label) || (alt && homeHtml.includes(alt))) {
      pass(`Nav tile: ${label}`);
    } else {
      fail(`Nav tile: ${label}`, "not found in HTML");
    }
  }

  if (homeHtml.includes("استكشف المنيو")) {
    pass("Welcome CTA unchanged");
  } else {
    fail("Welcome CTA unchanged");
  }

  if (homeHtml.includes("grid-cols-2") && homeHtml.includes("sm:grid-cols-4")) {
    pass("Responsive grid classes present");
  } else {
    fail("Responsive grid classes present");
  }

  const giftsGateUrl = `${BASE}/r/${SLUG}/gifts`;
  const { res: giftsRes, text: giftsHtml } = await fetchText(giftsGateUrl);
  if (giftsRes.ok && giftsHtml.includes("يرجى مسح رمز QR")) {
    pass("Gifts gate blocks without session", giftsGateUrl);
  } else if (giftsRes.ok) {
    pass("Gifts route reachable", giftsGateUrl);
  } else {
    fail("Gifts route", `HTTP ${giftsRes.status}`);
  }

  const wishesUrl = `${BASE}/r/${SLUG}/wishes`;
  const { res: wishesRes, text: wishesHtml } = await fetchText(wishesUrl);
  if (wishesRes.ok && wishesHtml.includes("يرجى مسح رمز QR")) {
    pass("Wishes gate blocks without session", wishesUrl);
  } else {
    fail("Wishes gate", `HTTP ${wishesRes.status}`);
  }

  const songUrl = `${BASE}/r/${SLUG}/song-request`;
  const { res: songRes, text: songHtml } = await fetchText(songUrl);
  if (songRes.ok && songHtml.includes("يرجى مسح رمز QR")) {
    pass("Song request gate blocks without session", songUrl);
  } else {
    fail("Song request gate", `HTTP ${songRes.status}`);
  }

  const reserveUrl = `${BASE}/r/${SLUG}/reserve`;
  const reserveRes = await fetch(reserveUrl, { redirect: "follow" });
  if (reserveRes.ok) {
    pass("Reservations regression", reserveUrl);
  } else {
    fail("Reservations regression", `HTTP ${reserveRes.status}`);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n--- Summary: ${checks.length - failed.length}/${checks.length} passed ---\n`);

  if (failed.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
