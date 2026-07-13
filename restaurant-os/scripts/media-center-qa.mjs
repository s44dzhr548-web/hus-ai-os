#!/usr/bin/env node
/**
 * Media Center QA — read-only production verification (no Fabrika data writes).
 * Usage: node scripts/media-center-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const results = [];
function record(name, ok, detail) {
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

async function main() {
  console.log(`\n=== Media Center QA @ ${BASE} ===\n`);

  let cookie = "";
  try {
    cookie = await login();
    record("Authentication", !!cookie);
  } catch (e) {
    record("Authentication", false, e.message);
    process.exit(1);
  }

  const pageRes = await fetch(`${BASE}/dashboard/media`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  record("Media Center page", pageRes.status === 200, `HTTP ${pageRes.status}`);

  const libRes = await fetch(`${BASE}/api/media/library`, {
    headers: { Cookie: cookie },
  });
  record("Media library API", libRes.ok, `HTTP ${libRes.status}`);

  if (libRes.ok) {
    const lib = await libRes.json();
    record("Library items payload", Array.isArray(lib.items), `${lib.items?.length ?? 0} items`);
    record("R2 storage configured", !!lib.storage?.r2Configured, lib.storage?.provider || "none");
    record("Hero video linked", !!lib.restaurant?.heroVideoUrl, lib.restaurant?.heroVideoUrl ? "yes" : "none");
    record("Menu items for publish", Array.isArray(lib.menuItems), `${lib.menuItems?.length ?? 0} items`);
    record("Categories for publish", Array.isArray(lib.categories), `${lib.categories?.length ?? 0} categories`);
  }

  const uploadCfg = await fetch(`${BASE}/api/upload/config`);
  const cfg = await json(uploadCfg);
  record("Upload config API", uploadCfg.ok, `HTTP ${uploadCfg.status}`);
  record("Image upload enabled", !!cfg.permanentStorageEnabled, cfg.imageFormats?.join(", ") || "");
  record("Video upload enabled", !!cfg.permanentStorageEnabled, cfg.videoFormats?.join(", ") || "");

  const brandingRes = await fetch(`${BASE}/api/restaurants/branding`, {
    headers: { Cookie: cookie },
  });
  if (brandingRes.ok) {
    const branding = await json(brandingRes);
    record("Landing hero video (branding)", !!branding.heroVideoUrl, branding.heroVideoUrl ? "configured" : "none");
  } else {
    record("Landing hero video (branding)", false, `HTTP ${brandingRes.status}`);
  }

  const tablesRes = await fetch(`${BASE}/api/tables`, { headers: { Cookie: cookie } });
  if (tablesRes.ok) {
    const tables = await json(tablesRes);
    const count = Array.isArray(tables) ? tables.length : tables?.tables?.length ?? 0;
    record("Fabrika tables intact (read-only)", count >= 100, `${count} tables`);
  } else {
    record("Fabrika tables intact (read-only)", false, `HTTP ${tablesRes.status}`);
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== ${passed}/${results.length} PASS ===`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
