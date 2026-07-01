/**
 * Verify production payment + webhook + cron configuration.
 * Usage: npx tsx scripts/verify-payment-config.ts [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const PLACEHOLDER = /placeholder/i;

type Check = { label: string; weight: number; ok: boolean; detail?: string };

async function json(res: Response) {
  return res.json().catch(() => ({}));
}

async function login(email: string, password: string): Promise<string> {
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
      email,
      password,
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

function record(checks: Check[], label: string, weight: number, ok: boolean, detail?: string) {
  checks.push({ label, weight, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`=== Payment & Billing Verification ===\n${BASE}\n`);
  const checks: Check[] = [];

  const adminCookie = await login("admin@menuos.sa", "admin123456");
  const configRes = await fetch(`${BASE}/api/billing/config?scope=platform`, {
    headers: { Cookie: adminCookie },
  });
  const config = await json(configRes);

  if (configRes.ok) {
    record(
      checks,
      "Billing gateway live mode",
      15,
      config.mode === "live" && config.liveReady === true,
      `mode=${config.mode}, liveReady=${config.liveReady}`
    );

    const pk = config.publishableKeyPrefix || "";
    record(
      checks,
      "Moyasar publishable key configured",
      10,
      Boolean(pk) && !PLACEHOLDER.test(pk),
      pk || "missing"
    );

    record(
      checks,
      "Webhook secret configured",
      15,
      config.webhookConfigured === true,
      config.webhookConfigured ? config.webhookUrl : "MOYASAR_WEBHOOK_SECRET missing"
    );

    record(
      checks,
      "Cron secret configured",
      10,
      config.cronConfigured === true,
      config.cronConfigured ? "CRON_SECRET set" : "CRON_SECRET missing"
    );
  } else {
    record(checks, "Billing config API", 50, false, `HTTP ${configRes.status}`);
  }

  const demoTable = "cmqidxux90001uoo8be3ajk2d";
  const checkoutRes = await fetch(`${BASE}/api/checkout?tableId=${demoTable}`);
  const checkout = await json(checkoutRes);
  if (checkoutRes.ok) {
    const pk = checkout.publishableKey || "";
    record(
      checks,
      "Checkout uses env publishable key",
      10,
      Boolean(pk) && !PLACEHOLDER.test(pk),
      pk ? `${pk.slice(0, 14)}...` : "missing"
    );
  } else {
    record(checks, "Checkout API", 10, false, `HTTP ${checkoutRes.status}`);
  }

  const paySettings = await fetch(`${BASE}/api/restaurants/payment-settings`, {
    headers: { Cookie: adminCookie },
  });
  const settings = await json(paySettings);
  if (paySettings.ok) {
    const hasPlaceholder = [
      settings.moyasarPublishableKey,
      settings.tapPublishableKey,
      settings.stripePublishableKey,
    ].some((f) => f && PLACEHOLDER.test(String(f)));
    record(
      checks,
      "No placeholder keys in payment settings",
      10,
      !hasPlaceholder && settings.moyasarKeySource === "environment",
      settings.moyasarKeySource
    );
  }

  const webhookBad = await fetch(`${BASE}/api/billing/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "payment_paid", data: { id: "test" } }),
  });
  record(
    checks,
    "Webhook rejects unsigned payload",
    10,
    webhookBad.status === 401,
    `HTTP ${webhookBad.status}`
  );

  const cronBad = await fetch(`${BASE}/api/cron/subscriptions`);
  record(
    checks,
    "Cron rejects unauthenticated requests",
    10,
    cronBad.status === 401,
    `HTTP ${cronBad.status}`
  );

  const checkoutSession = await fetch(`${BASE}/api/billing/checkout`, {
    method: "POST",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "STARTER" }),
  });
  const session = await json(checkoutSession);
  record(
    checks,
    "Billing checkout session creates invoice",
    10,
    checkoutSession.ok && Boolean(session.billingId),
    session.invoiceNumber || session.error
  );

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter((c) => c.ok).reduce((s, c) => s + c.weight, 0);
  const pct = Math.round((earned / totalWeight) * 100);
  const failed = checks.filter((c) => !c.ok);

  console.log(`\n=== Launch Readiness: ${pct}% ===`);
  console.log(`Passed ${checks.length - failed.length}/${checks.length} checks (${earned}/${totalWeight} points)`);
  if (failed.length) {
    console.log("\nRemaining:");
    failed.forEach((c) => console.log(`  • ${c.label}${c.detail ? `: ${c.detail}` : ""}`));
  }
  console.log(`\nWebhook URL: ${BASE}/api/billing/webhook`);
  console.log(`Cron URL: ${BASE}/api/cron/subscriptions`);

  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
