/**
 * Customer history & permanent records tests.
 * Usage: npx tsx scripts/customer-history-test.ts [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3005";

const ADMIN_EMAIL = "admin@menuos.sa";
const ADMIN_PASSWORD = "admin123456";
const TEST_PHONE = "0507771234";

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

async function login(): Promise<string> {
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
  console.log(`=== Customer History Test ===\n${BASE}\n`);

  let cookie = "";
  try {
    cookie = await login();
    pass("0. Admin login");
  } catch (e) {
    fail("0. Admin login", String(e));
    printSummary();
    process.exit(1);
  }

  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const customersPage = await fetch(`${BASE}/dashboard/customers`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if ([200, 307, 308].includes(customersPage.status)) {
    pass("1. Customer history page accessible", `HTTP ${customersPage.status}`);
  } else {
    fail("1. Customer history page accessible", `HTTP ${customersPage.status}`);
  }

  const historyPage = await fetch(`${BASE}/dashboard/reservations/history`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if ([200, 307, 308].includes(historyPage.status)) {
    pass("2. Reservations history URL accessible", `HTTP ${historyPage.status}`);
  } else {
    fail("2. Reservations history URL accessible", `HTTP ${historyPage.status}`);
  }

  const receptionGet = await json(
    await fetch(`${BASE}/api/reception`, { headers: { Cookie: cookie } })
  );
  const tableId = receptionGet.cards?.find(
    (c: { session: unknown }) => !c.session
  )?.table?.id;

  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const oldDateStr = twoMonthsAgo.toISOString().split("T")[0];

  const createRes = await fetch(`${BASE}/api/reservations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerName: "History Test Guest",
      customerPhone: TEST_PHONE,
      guestCount: 2,
      date: oldDateStr,
      time: "19:00",
      occasion: "Anniversary",
      notes: "Permanent record test",
    }),
  });
  const reservation = await json(createRes);
  const reservationId = reservation.id;

  if (!createRes.ok) {
    fail("3. Create reservation", reservation.error || `HTTP ${createRes.status}`);
  } else {
    pass("3. Create reservation", reservationId);
  }

  if (reservationId) {
    await fetch(`${BASE}/api/reservations/${reservationId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "approve" }),
    });
    const arrivedRes = await fetch(`${BASE}/api/reservations/${reservationId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "mark_arrived" }),
    });
    const arrived = await json(arrivedRes);
    if (arrivedRes.ok && arrived.arrivedAt) {
      pass("4. Mark arrived (arrivedAt set)");
    } else {
      fail("4. Mark arrived", `HTTP ${arrivedRes.status}`);
    }

    if (tableId) {
      await fetch(`${BASE}/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "assign_table", tableId }),
      });

      const convertRes = await fetch(`${BASE}/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "convert", tableId }),
      });
      const convertData = await json(convertRes);
      const sessionId = convertData.session?.id;

      if (convertRes.ok && sessionId) {
        pass("5. Convert to active session", sessionId);

        const closeRes = await fetch(`${BASE}/api/reception/${sessionId}`, {
          method: "DELETE",
          headers: { Cookie: cookie },
        });
        const closed = await json(closeRes);
        if (closeRes.ok && closed.status === "COMPLETED" && closed.endedAt) {
          pass("6. Complete session (soft-close, record kept)", closed.id);
        } else {
          fail("6. Complete session", JSON.stringify(closed));
        }

        const sessionCheck = await fetch(`${BASE}/api/customers?view=visits&phone=${TEST_PHONE}`, {
          headers: { Cookie: cookie },
        });
        const visitsData = await json(sessionCheck);
        const completedVisit = visitsData.visits?.find(
          (v: { visitStatus: string }) => v.visitStatus === "COMPLETED"
        );
        if (completedVisit?.endTime) {
          pass("7. Visit record persists after completion");
        } else {
          fail("7. Visit record persists after completion", JSON.stringify(visitsData.visits?.[0]));
        }
      } else {
        fail("5. Convert to active session", convertData.error);
        fail("6. Complete session", "skipped");
        fail("7. Visit record persists after completion", "skipped");
      }
    } else {
      fail("5. Convert to active session", "no table");
      fail("6. Complete session", "skipped");
      fail("7. Visit record persists after completion", "skipped");
    }

    const resCheck = await fetch(`${BASE}/api/customers?view=reservations&phone=${TEST_PHONE}`, {
      headers: { Cookie: cookie },
    });
    const resData = await json(resCheck);
    const stillExists = resData.reservations?.some(
      (r: { id: string }) => r.id === reservationId
    );
    if (stillExists) {
      pass("8. Old reservation not deleted after completion");
    } else {
      fail("8. Old reservation not deleted", "reservation missing");
    }

    const searchRes = await fetch(
      `${BASE}/api/customers?phone=${TEST_PHONE}`,
      { headers: { Cookie: cookie } }
    );
    const searchData = await json(searchRes);
    if (searchRes.ok && searchData.customers?.length > 0) {
      pass("9. Search customer by phone (2-month-old reservation)", searchData.customers[0].customerName);
    } else {
      fail("9. Search customer by phone", "not found");
    }

    const exportRes = await fetch(
      `${BASE}/api/customers/export?type=customers&phone=${TEST_PHONE}`,
      { headers: { Cookie: cookie } }
    );
    const csv = await exportRes.text();
    if (exportRes.ok && csv.includes("History Test Guest")) {
      pass("10. Export customer history CSV");
    } else {
      fail("10. Export customer history CSV", `HTTP ${exportRes.status}`);
    }

    const menuRes = await fetch(`${BASE}/api/public/menu/${tableId || "x"}`);
    const menuData = await json(menuRes);
    if (!menuData.activeSession?.customerPhone) {
      pass("11. Phone hidden from public QR menu");
    } else {
      fail("11. Phone hidden from public QR menu", "phone exposed");
    }

    const reportsRes = await fetch(`${BASE}/api/customers?view=reports`, {
      headers: { Cookie: cookie },
    });
    const reports = await json(reportsRes);
    if (reportsRes.ok && typeof reports.totalVisits === "number") {
      pass("12. Dashboard reports available", `${reports.totalVisits} visits`);
    } else {
      fail("12. Dashboard reports", `HTTP ${reportsRes.status}`);
    }
  } else {
    for (let i = 4; i <= 12; i++) fail(`${i}. skipped`, "no reservation");
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  console.log(`Customer history: ${BASE}/dashboard/customers`);
  console.log(`Reservations history: ${BASE}/dashboard/reservations/history`);
  console.log(`Reception: ${BASE}/dashboard/reception`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
