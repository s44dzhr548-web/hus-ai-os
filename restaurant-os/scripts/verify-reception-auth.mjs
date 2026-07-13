const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";
const EMAIL = "admin@menuos.sa";
const PASS = "admin123456";

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
      email: EMAIL,
      password: PASS,
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
  const cookie = await login();
  const html = await (
    await fetch(`${BASE}/dashboard/reception`, { headers: { Cookie: cookie } })
  ).text();

  const scripts = [...new Set([...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]))];
  let combined = html;
  for (const src of scripts) {
    try {
      combined += await (await fetch(`${BASE}${src}`)).text();
    } catch {
      /* skip */
    }
  }

  const needles = ["إدخال يدوي", "manual-table-number", "تعديل البيانات"];
  let pass = 0;
  for (const n of needles) {
    if (combined.includes(n)) {
      console.log("PASS:", n);
      pass++;
    } else {
      console.error("FAIL:", n);
    }
  }
  console.log(`\n${pass}/${needles.length} UI strings in authenticated bundle`);
  process.exit(pass === needles.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
