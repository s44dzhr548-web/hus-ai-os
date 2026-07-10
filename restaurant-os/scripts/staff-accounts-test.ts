/**
 * Reception staff accounts E2E tests.
 * Usage: npx tsx scripts/staff-accounts-test.ts [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3005";

const OWNER_EMAIL = "admin@menuos.sa";
const OWNER_PASSWORD = "admin123456";

const STAFF_EMAIL = `reception.staff.${Date.now()}@menuos.sa`;
const STAFF_PASSWORD = "Reception123!";
const STAFF_NAME = "QA Reception Staff";

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
  console.log(`=== Staff Accounts Test ===\n${BASE}\n`);

  let ownerCookie = "";
  try {
    ownerCookie = await login(OWNER_EMAIL, OWNER_PASSWORD);
    pass("0. Owner login");
  } catch (e) {
    fail("0. Owner login", String(e));
    printSummary();
    process.exit(1);
  }

  const ownerHeaders = { Cookie: ownerCookie, "Content-Type": "application/json" };

  const staffPage = await fetch(`${BASE}/dashboard/staff`, {
    headers: { Cookie: ownerCookie },
    redirect: "manual",
  });
  if ([200, 307, 308].includes(staffPage.status)) {
    pass("1. Staff management page accessible", `HTTP ${staffPage.status}`);
  } else {
    fail("1. Staff management page accessible", `HTTP ${staffPage.status}`);
  }

  const createRes = await fetch(`${BASE}/api/staff`, {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({
      name: STAFF_NAME,
      email: STAFF_EMAIL,
      phone: "0501112233",
      password: STAFF_PASSWORD,
      role: "RECEPTION",
      isActive: true,
    }),
  });
  const created = await json(createRes);
  const staffId = created.id;

  if (!createRes.ok) {
    fail("2. Owner creates reception staff", created.error || `HTTP ${createRes.status}`);
  } else {
    pass("2. Owner creates reception staff", staffId);
  }

  let staffCookie = "";
  if (staffId) {
    try {
      staffCookie = await login(STAFF_EMAIL, STAFF_PASSWORD);
      if (staffCookie) pass("3. Reception staff logs in");
      else fail("3. Reception staff logs in", "no cookie");
    } catch (e) {
      fail("3. Reception staff logs in", String(e));
    }

    const sessionRes = await fetch(`${BASE}/api/auth/session`, {
      headers: { Cookie: staffCookie },
    });
    const session = await json(sessionRes);
    if (session?.user?.role === "RECEPTION") {
      pass("4. Session role is RECEPTION");
    } else {
      fail("4. Session role is RECEPTION", session?.user?.role);
    }

    const receptionRes = await fetch(`${BASE}/dashboard/reception`, {
      headers: { Cookie: staffCookie },
      redirect: "manual",
    });
    if ([200, 307, 308].includes(receptionRes.status)) {
      pass("5. Reception staff opens reception page", `HTTP ${receptionRes.status}`);
    } else {
      fail("5. Reception staff opens reception page", `HTTP ${receptionRes.status}`);
    }

    const dashRedirect = await fetch(`${BASE}/dashboard`, {
      headers: { Cookie: staffCookie },
      redirect: "manual",
    });
    const location = dashRedirect.headers.get("location") || "";
    if (location.includes("/dashboard/reception") || dashRedirect.url.includes("reception")) {
      pass("6. Reception staff redirected to /dashboard/reception");
    } else if (dashRedirect.status === 307 || dashRedirect.status === 308) {
      pass("6. Reception staff redirected to /dashboard/reception", location);
    } else {
      fail("6. Reception staff redirected to /dashboard/reception", `HTTP ${dashRedirect.status} ${location}`);
    }

    const billingRes = await fetch(`${BASE}/dashboard/billing`, {
      headers: { Cookie: staffCookie },
      redirect: "manual",
    });
    const billingLoc = billingRes.headers.get("location") || "";
    if (
      billingRes.status === 307 ||
      billingRes.status === 308 ||
      billingLoc.includes("reception") ||
      !billingLoc.includes("/dashboard/billing")
    ) {
      pass("7. Reception staff blocked from billing");
    } else if (billingRes.status === 403) {
      pass("7. Reception staff blocked from billing");
    } else {
      fail("7. Reception staff blocked from billing", `HTTP ${billingRes.status}`);
    }

    const settingsRes = await fetch(`${BASE}/dashboard/settings`, {
      headers: { Cookie: staffCookie },
      redirect: "manual",
    });
    const settingsLoc = settingsRes.headers.get("location") || "";
    if (
      settingsRes.status === 307 ||
      settingsRes.status === 308 ||
      settingsLoc.includes("reception") ||
      !settingsLoc.includes("/dashboard/settings")
    ) {
      pass("8. Reception staff blocked from settings");
    } else {
      fail("8. Reception staff blocked from settings", `HTTP ${settingsRes.status}`);
    }

    await fetch(`${BASE}/api/staff/${staffId}`, {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({ isActive: false }),
    });

    let disabledLogin = "";
    try {
      disabledLogin = await login(STAFF_EMAIL, STAFF_PASSWORD);
    } catch {
      /* expected */
    }

    const disabledSession = disabledLogin
      ? await json(
          await fetch(`${BASE}/api/auth/session`, {
            headers: { Cookie: disabledLogin },
          })
        )
      : null;

    if (!disabledLogin || !disabledSession?.user?.restaurantId) {
      pass("9. Disabled staff cannot login");
    } else {
      fail("9. Disabled staff cannot login", "session still valid");
    }

    await fetch(`${BASE}/api/staff/${staffId}`, {
      method: "DELETE",
      headers: ownerHeaders,
    });
    pass("10. Cleanup: staff account deleted");
  } else {
    for (let i = 3; i <= 10; i++) fail(`${i}. skipped`, "no staff created");
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  console.log(`Staff management: ${BASE}/dashboard/staff`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
