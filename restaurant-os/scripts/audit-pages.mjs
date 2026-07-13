#!/usr/bin/env node
/**
 * Full page audit with auth — checks final HTTP status and 404 markers in HTML.
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const PAGES = [
  ["Home", "/"],
  ["Login", "/login"],
  ["Dashboard", "/dashboard"],
  ["Reception", "/dashboard/reception"],
  ["Reservations", "/dashboard/reservations"],
  ["Reservation History", "/dashboard/reservations/history"],
  ["Customers", "/dashboard/customers"],
  ["Tables", "/dashboard/tables"],
  ["Orders", "/dashboard/orders"],
  ["Kitchen", "/dashboard/kitchen"],
  ["Branding", "/dashboard/branding"],
  ["Staff", "/dashboard/staff"],
  ["Reports", "/dashboard/reports"],
  ["Settings", "/dashboard/settings"],
  ["QR Menu (dashboard)", "/dashboard/menu"],
  ["Public Menu", "/r/menu-os-demo/table/menu-os-demo-t1"],
  ["Owner Portal", "/dashboard/restaurant"],
  ["Platform (owner)", "/dashboard/platform"],
];

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

function looks404(html, path) {
  if (path.startsWith("/r/") || path.startsWith("/menu/")) {
    return /This page could not be found|هذه الصفحة غير موجودة/i.test(html);
  }
  return (
    /404|not found|page could not be found|هذه الصفحة غير موجودة/i.test(html) &&
    !/الحجوزات|Reservations|Menu OS|menu-os/i.test(html.slice(0, 4000))
  );
}

async function checkPage(name, path, cookie, auth) {
  const headers = auth && cookie ? { Cookie: cookie } : {};
  const r = await fetch(`${BASE}${path}`, { headers, redirect: "follow" });
  const html = await r.text();
  const bad404 = r.status === 404 || looks404(html, path);
  const bad500 = r.status >= 500;
  const ok = r.status === 200 && !bad404 && !bad500;
  return { name, path, status: r.status, ok, auth, detail: bad404 ? "404 content" : bad500 ? "5xx" : "" };
}

async function main() {
  console.log(`Page audit: ${BASE}\n`);
  let cookie = "";
  try {
    cookie = await login();
  } catch (e) {
    console.error("Login failed:", e.message);
    process.exit(1);
  }

  const results = [];
  for (const [name, path] of PAGES) {
    results.push(await checkPage(name, path, cookie, false));
    if (path.startsWith("/dashboard")) {
      results.push(await checkPage(`${name} (auth)`, path, cookie, true));
    }
  }

  let pass = 0;
  let fail = 0;
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    if (r.ok) pass++;
    else fail++;
    console.log(
      `${mark} | ${r.name} | ${r.path} | HTTP ${r.status}${r.auth ? " (auth)" : ""}${r.detail ? ` | ${r.detail}` : ""}`
    );
  }
  console.log(`\n=== ${pass}/${pass + fail} PASS ===`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
