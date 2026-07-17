/**
 * Enable Fabrika customer landing nav via production API.
 * Resolves Fabrika's real slug from the database (not menu-os-demo).
 * Restaurant config only — no customer/reservation/gift data changes.
 *
 * Usage: node scripts/enable-fabrika-customer-nav.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const SLUG_OVERRIDE = process.env.RESTAURANT_SLUG || "";

async function json(res) {
  return res.json().catch(() => ({}));
}

function parseSetCookie(res, prev = "") {
  const parts = new Set(prev ? prev.split("; ").filter(Boolean) : []);
  for (const c of res.headers.getSetCookie?.() || []) {
    parts.add(c.split(";")[0]);
  }
  return [...parts].join("; ");
}

async function login() {
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
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });
  return parseSetCookie(loginRes, cookie);
}

function isFabrikaCandidate(r) {
  if (!r?.slug || r.slug === "menu-os-demo" || r.isActive === false) return false;
  const label = `${r.name || ""} ${r.nameAr || ""} ${r.slug}`;
  return /fabrika|fabraka|فابريك/i.test(label);
}

function rankFabrikaCandidates(list) {
  return [...list].sort((a, b) => {
    const aFabrika = a.slug.startsWith("fabrika-") ? 1 : 0;
    const bFabrika = b.slug.startsWith("fabrika-") ? 1 : 0;
    if (bFabrika !== aFabrika) return bFabrika - aFabrika;
    const aLounge = /لاونج|lounge/i.test(`${a.name} ${a.nameAr}`) ? 1 : 0;
    const bLounge = /لاونج|lounge/i.test(`${b.name} ${b.nameAr}`) ? 1 : 0;
    return bLounge - aLounge;
  });
}

async function resolveFabrikaRestaurant(cookie) {
  if (SLUG_OVERRIDE) {
    const listRes = await fetch(`${BASE}/api/restaurants/switch`, {
      headers: { Cookie: cookie },
    });
    const list = await json(listRes);
    const match = (Array.isArray(list) ? list : []).find((r) => r.slug === SLUG_OVERRIDE);
    if (!match) throw new Error(`RESTAURANT_SLUG not found: ${SLUG_OVERRIDE}`);
    return match;
  }

  const listRes = await fetch(`${BASE}/api/restaurants/switch`, {
    headers: { Cookie: cookie },
  });
  const list = await json(listRes);
  const candidates = rankFabrikaCandidates(
    (Array.isArray(list) ? list : []).filter(isFabrikaCandidate)
  );

  if (!candidates.length) {
    throw new Error("No Fabrika restaurant found in production database");
  }

  let best = candidates[0];
  let bestTables = -1;

  for (const candidate of candidates.slice(0, 5)) {
    const switchRes = await fetch(`${BASE}/api/restaurants/switch`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: candidate.id }),
    });
    const scopedCookie = parseSetCookie(switchRes, cookie);
    const reception = await json(
      await fetch(`${BASE}/api/reception`, { headers: { Cookie: scopedCookie } })
    );
    const tableCount = reception.cards?.length ?? 0;
    if (tableCount > bestTables) {
      bestTables = tableCount;
      best = candidate;
    }
  }

  return best;
}

async function switchToRestaurant(cookie, restaurantId) {
  const res = await fetch(`${BASE}/api/restaurants/switch`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to switch restaurant: HTTP ${res.status}`);
  }
  return parseSetCookie(res, cookie);
}

async function main() {
  console.log(`Enabling Fabrika customer nav via ${BASE}\n`);
  let cookie = await login();

  const fabrika = await resolveFabrikaRestaurant(cookie);
  console.log(
    `Fabrika resolved: slug=${fabrika.slug} name=${fabrika.nameAr || fabrika.name} id=${fabrika.id}`
  );

  cookie = await switchToRestaurant(cookie, fabrika.id);

  const settingsRes = await fetch(`${BASE}/api/restaurants/gift-settings`, {
    method: "PATCH",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      enabled: true,
      wishesEnabled: true,
      songRequestsEnabled: true,
      acceptanceTimeoutMinutes: 2,
      allowAnonymous: true,
      showSenderName: true,
    }),
  });

  if (!settingsRes.ok) {
    console.error("gift-settings PATCH failed", await settingsRes.text());
    process.exit(1);
  }
  console.log("✓ Feature flags enabled (gifts, wishes, song requests)");

  const brandingRes = await fetch(`${BASE}/api/restaurants/branding`, {
    headers: { Cookie: cookie },
  });
  const branding = await json(brandingRes);
  if (!brandingRes.ok) {
    console.error("branding GET failed");
    process.exit(1);
  }

  const sections = (branding.homepageSections || []).map((s) => {
    if (s.id === "gift") {
      return { ...s, enabled: true, titleAr: "الإهداء" };
    }
    if (["wishes", "song_request", "events"].includes(s.id)) {
      return { ...s, enabled: true };
    }
    return s;
  });

  for (const id of ["gift", "wishes", "song_request"]) {
    if (!sections.find((s) => s.id === id)) {
      sections.push({
        id,
        titleAr: id === "gift" ? "الإهداء" : id === "wishes" ? "الأمنيات" : "طلب أغنية",
        titleEn: id === "gift" ? "Gifts" : id === "wishes" ? "Wishes" : "Song Request",
        enabled: true,
        order: id === "gift" ? 2 : id === "wishes" ? 3 : 4,
      });
    }
  }

  const putRes = await fetch(`${BASE}/api/restaurants/branding`, {
    method: "PUT",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ homepageSections: sections }),
  });

  if (!putRes.ok) {
    console.error("branding PUT failed", await putRes.text());
    process.exit(1);
  }
  console.log("✓ Homepage sections enabled (additive merge)");
  console.log(`\nFabrika customer URL: ${BASE}/r/${fabrika.slug}`);
  console.log("Done — revalidate customer home in browser.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
