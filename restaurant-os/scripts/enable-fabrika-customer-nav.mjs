/**
 * Enable Fabrika (menu-os-demo) customer landing nav via production API.
 * Restaurant config only — no customer/reservation/gift data changes.
 *
 * Usage: node scripts/enable-fabrika-customer-nav.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

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

async function main() {
  console.log(`Enabling customer nav flags via ${BASE}\n`);
  const cookie = await login();

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
  console.log("\nDone — revalidate customer home in browser.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
