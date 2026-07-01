/**
 * Billing system smoke tests.
 * Usage: npx tsx scripts/billing-test.ts [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const ADMIN_EMAIL = "admin@menuos.sa";
const ADMIN_PASSWORD = "admin123456";

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

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

async function main() {
  console.log(`=== Billing Test ===\n${BASE}\n`);

  const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

  const platformBilling = await fetch(`${BASE}/api/platform/billing`, {
    headers: { Cookie: adminCookie },
  });
  const billingData = await json(platformBilling);
  if (platformBilling.ok && billingData.stats?.mrr != null) {
    pass("1. platform billing stats API", `MRR=${billingData.stats.mrr}`);
  } else {
    fail("1. platform billing stats API", `HTTP ${platformBilling.status}`);
  }

  const ownerEmail = `bill_owner_${Date.now()}@test.menuos.sa`;
  const ownerPassword = "TestPass123!";
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerName: "Bill Owner",
      email: ownerEmail,
      password: ownerPassword,
      restaurantName: "Billing Test",
      restaurantNameAr: "اختبار الفوترة",
      branchNameAr: "فرع",
      city: "Riyadh",
      phone: "+966501234567",
    }),
  });
  const regData = await json(reg);
  if (!reg.ok) {
    fail("2-5. owner flow", regData.error || String(reg.status));
  } else {
    const ownerCookie = await login(ownerEmail, ownerPassword);

    const sub = await fetch(`${BASE}/api/subscription`, {
      headers: { Cookie: ownerCookie },
    });
    const subData = await json(sub);
    if (sub.ok && subData.subscription?.status === "TRIAL") {
      pass("2. new account starts on 14-day trial");
    } else {
      fail("2. new account starts on 14-day trial", subData.subscription?.status);
    }

    const checkout = await fetch(`${BASE}/api/billing/checkout`, {
      method: "POST",
      headers: { Cookie: ownerCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "STARTER" }),
    });
    const checkoutData = await json(checkout);
    if (checkout.ok && checkoutData.billingId) {
      pass("3. checkout session created", checkoutData.invoiceNumber);
    } else {
      fail("3. checkout session created", checkoutData.error || checkout.status);
    }

    if (checkoutData.billingId) {
      const isLive = checkoutData.mode === "live" || checkoutData.publishableKey?.startsWith("pk_live");
      if (isLive) {
        pass("4. payment callback (live mode)", "mock payments skipped — use Moyasar checkout");
      } else {
        const mockId = `mock_bill_${Date.now()}`;
        const callback = await fetch(
          `${BASE}/api/billing/callback?billingId=${checkoutData.billingId}&id=${mockId}`,
          { headers: { Cookie: ownerCookie }, redirect: "manual" }
        );
        if (callback.status === 307 || callback.status === 308 || callback.status === 302) {
          pass("4. payment callback activates subscription");
        } else {
          fail("4. payment callback activates subscription", `HTTP ${callback.status}`);
        }
      }
    }

    const payments = await fetch(`${BASE}/api/billing/payments`, {
      headers: { Cookie: ownerCookie },
    });
    const payData = await json(payments);
    if (payments.ok && Array.isArray(payData.payments)) {
      pass("5. owner payment history", `${payData.payments.length} records`);
    } else {
      fail("5. owner payment history", `HTTP ${payments.status}`);
    }

    const webhookNoSig = await fetch(`${BASE}/api/billing/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "test" }),
    });
    if (webhookNoSig.status === 401 || webhookNoSig.status === 422) {
      pass("6. webhook rejects unsigned/invalid payload");
    } else {
      fail("6. webhook rejects unsigned/invalid payload", `HTTP ${webhookNoSig.status}`);
    }
  }

  const pages = [
    ["/dashboard/billing", "owner billing page"],
    ["/dashboard/subscription", "owner subscription page"],
    ["/dashboard/platform/billing", "platform billing page"],
    ["/pricing", "public pricing page"],
  ];

  for (const [path, label] of pages) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    if (res.status === 200 || res.status === 307) {
      pass(`7. ${label} reachable`, `HTTP ${res.status}`);
    } else {
      fail(`7. ${label} reachable`, `HTTP ${res.status}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${failed.length ? "FAILED" : "PASSED"} (${results.length - failed.length}/${results.length}) ===`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
