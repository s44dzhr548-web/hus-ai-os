const BASE = process.argv[2] || "https://www.menuhus.com";
const jobId = process.argv[3];
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

const cookie = await login();
for (let i = 0; i < 24; i++) {
  const j = await json(
    await fetch(`${BASE}/api/marketing/creative/video/jobs/${jobId}`, { headers: { Cookie: cookie } })
  );
  console.log(`poll ${i + 1}:`, JSON.stringify({ status: j.status, progress: j.progress, error: j.error, hasOutput: Boolean(j.outputUrl) }));
  if (j.status === "SUCCEEDED" || j.status === "FAILED") {
    if (j.outputUrl) console.log("OUTPUT_URL", j.finalOutputUrl || j.outputUrl);
    break;
  }
  await new Promise((r) => setTimeout(r, 10000));
}
