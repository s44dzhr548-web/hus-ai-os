/**
 * Live smoke checks (no secrets). Optional: SMOKE_BASE=https://restaurant-os-nine.vercel.app
 */
const base = (process.env.SMOKE_BASE || "https://restaurant-os-nine.vercel.app").replace(/\/$/, "");

const results = [];

async function check(name, fn) {
  try {
    const ok = await fn();
    results.push({ name, ok: !!ok });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e) });
    console.log(`FAIL ${name}`, e);
  }
}

await check("site reachable", async () => {
  const r = await fetch(base, { redirect: "follow" });
  return r.ok;
});

await check("platforms page loads (HTML)", async () => {
  const r = await fetch(`${base}/dashboard/marketing/platforms`, { redirect: "manual" });
  return r.status === 200 || r.status === 307 || r.status === 302;
});

await check("platforms API requires auth", async () => {
  const r = await fetch(`${base}/api/marketing/platforms`);
  return r.status === 401 || r.status === 403;
});

await check("qr print requires auth", async () => {
  const r = await fetch(`${base}/api/qr/print?preview=1&branchId=x`);
  return r.status === 401 || r.status === 403 || r.status === 400;
});

await check("reservations API requires auth", async () => {
  const r = await fetch(`${base}/api/reservations`);
  return r.status === 401 || r.status === 403;
});

const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ base, results, passed: results.length - failed, failed }, null, 2));
process.exit(failed ? 1 : 0);
