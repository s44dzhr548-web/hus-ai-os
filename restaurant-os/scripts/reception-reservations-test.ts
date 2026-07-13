/**
 * Reception & Reservations module tests.
 * Usage: npx tsx scripts/reception-reservations-test.ts [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3005";

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
  console.log(`=== Reception & Reservations Test ===\n${BASE}\n`);

  let cookie = "";
  try {
    cookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (cookie) pass("0. Admin login");
    else fail("0. Admin login", "no cookie");
  } catch (e) {
    fail("0. Admin login", String(e));
    printSummary();
    process.exit(1);
  }

  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const receptionPage = await fetch(`${BASE}/dashboard/reception`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if ([200, 307, 308].includes(receptionPage.status)) {
    pass("1. Reception dashboard accessible", `HTTP ${receptionPage.status}`);
  } else {
    fail("1. Reception dashboard accessible", `HTTP ${receptionPage.status}`);
  }

  const reservationsPage = await fetch(`${BASE}/dashboard/reservations`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if ([200, 307, 308].includes(reservationsPage.status)) {
    pass("2. Reservations dashboard accessible", `HTTP ${reservationsPage.status}`);
  } else {
    fail("2. Reservations dashboard accessible", `HTTP ${reservationsPage.status}`);
  }

  const receptionGet = await fetch(`${BASE}/api/reception`, { headers: { Cookie: cookie } });
  const receptionData = await json(receptionGet);
  if (!receptionGet.ok) {
    fail("3. GET /api/reception", `HTTP ${receptionGet.status}: ${receptionData.error}`);
  } else {
    pass("3. GET /api/reception", `${receptionData.cards?.length ?? 0} tables`);
  }

  const availableTable = receptionData.cards?.find(
    (c: { session: unknown }) => !c.session
  );
  const tableId = availableTable?.table?.id;

  let sessionId = "";
  let walkInData: { id?: string; tableId?: string } = {};
  if (!tableId) {
    fail("4. Walk-in customer created", "no available table");
  } else {
    const walkIn = await fetch(`${BASE}/api/reception`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customerName: "QA Test Guest",
        customerPhone: "0500009999",
        guestCount: 3,
        tableId,
        minimumSpendAmount: 100,
        status: "SEATED",
        notes: "QA walk-in test",
      }),
    });
    walkInData = await json(walkIn);
    if (!walkIn.ok) {
      fail("4. Walk-in customer created", `HTTP ${walkIn.status}: ${walkInData.error}`);
    } else {
      sessionId = walkInData.id;
      pass("4. Walk-in customer created", `session ${sessionId}`);
    }
  }

  if (sessionId) {
    const patchRes = await fetch(`${BASE}/api/reception/${sessionId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ minimumSpendAmount: 100, status: "ORDERING" }),
    });
    const patchData = await json(patchRes);
    const minSpend = patchData.session?.minimumSpendAmount ?? patchData.minimumSpendAmount;
    if (patchRes.ok && Number(minSpend) === 100) {
      pass("5. Minimum spend assigned", "100 SAR");
    } else {
      fail("5. Minimum spend assigned", `HTTP ${patchRes.status}, min=${minSpend}`);
    }
  } else {
    fail("5. Minimum spend assigned", "skipped");
  }

  const menuTableId =
    (sessionId && walkInData?.tableId) || tableId || receptionData.cards?.[0]?.table?.id;
  if (menuTableId) {
    let menuRes: Response | null = null;
    let menuData: Record<string, unknown> = {};
    for (let attempt = 0; attempt < 5; attempt++) {
      menuRes = await fetch(`${BASE}/api/public/menu/${menuTableId}`);
      menuData = await json(menuRes);
      if (menuData.activeSession?.customerName) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    const minSpend =
      menuData.activeSession?.minimumSpendAmount ?? menuData.table?.minimumSpendAmount;
    if (
      menuRes!.ok &&
      menuData.activeSession?.customerName &&
      Number(minSpend) === 100
    ) {
      pass(
        "6. Customer menu shows session + minimum spend",
        menuData.activeSession.customerName
      );
      if (menuData.activeSession.customerPhone !== undefined) {
        fail("6b. Customer phone hidden from public menu", "phone exposed");
      } else {
        pass("6b. Customer phone hidden from public menu");
      }
    } else if (menuRes.ok && !sessionId) {
      pass("6. Customer menu loads (no active session)", `table ${menuTableId}`);
    } else {
      fail(
        "6. Customer menu shows session + minimum spend",
        JSON.stringify(menuData.activeSession)
      );
    }
  } else {
    fail("6. Customer menu shows session + minimum spend", "no table");
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const createRes = await fetch(`${BASE}/api/reservations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerName: "QA Reservation Guest",
      customerPhone: "0500008888",
      guestCount: 4,
      date: dateStr,
      time: "20:00",
      occasion: "Birthday",
      notes: "QA reservation test",
    }),
  });
  const reservation = await json(createRes);
  let reservationId = reservation.id;

  if (!createRes.ok) {
    fail("7. Reservation created", `HTTP ${createRes.status}: ${reservation.error}`);
  } else {
    pass("7. Reservation created", reservationId);
  }

  if (reservationId) {
    const approveRes = await fetch(`${BASE}/api/reservations/${reservationId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "approve" }),
    });
    const approveData = await json(approveRes);
    if (approveRes.ok && ["APPROVED", "CONFIRMED"].includes(approveData.status)) {
      pass("8. Reception approves reservation");
    } else {
      fail("8. Reception approves reservation", `HTTP ${approveRes.status}`);
    }

    const freeTable = (
      await json(await fetch(`${BASE}/api/reception`, { headers: { Cookie: cookie } }))
    ).cards?.find((c: { session: unknown; table: { id: string } }) => !c.session && c.table.id !== tableId);

    const convertTableId = freeTable?.table?.id || tableId;
    if (convertTableId && convertTableId !== tableId) {
      await fetch(`${BASE}/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "assign_table", tableId: convertTableId }),
      });

      const convertRes = await fetch(`${BASE}/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "convert", tableId: convertTableId }),
      });
      const convertData = await json(convertRes);
      if (convertRes.ok && convertData.session?.id) {
        pass("9. Reservation converts to active session", convertData.session.id);

        const closeRes = await fetch(`${BASE}/api/reception/${convertData.session.id}`, {
          method: "DELETE",
          headers: { Cookie: cookie },
        });
        if (closeRes.ok) {
          pass("10. Closing session frees table");
        } else {
          fail("10. Closing session frees table", `HTTP ${closeRes.status}`);
        }
      } else {
        fail("9. Reservation converts to active session", convertData.error || `HTTP ${convertRes.status}`);
        fail("10. Closing session frees table", "skipped");
      }
    } else {
      fail("9. Reservation converts to active session", "no free table for convert");
      fail("10. Closing session frees table", "skipped");
    }
  } else {
    fail("8. Reception approves reservation", "skipped");
    fail("9. Reservation converts to active session", "skipped");
    fail("10. Closing session frees table", "skipped");
  }

  if (sessionId) {
    const closeWalkIn = await fetch(`${BASE}/api/reception/${sessionId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    if (closeWalkIn.ok) {
      pass("11. Walk-in session closed (cleanup)");
    } else {
      fail("11. Walk-in session closed (cleanup)", `HTTP ${closeWalkIn.status}`);
    }
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  console.log(`Reception: ${BASE}/dashboard/reception`);
  console.log(`Reservations: ${BASE}/dashboard/reservations`);
  console.log(`Example menu: ${BASE}/menu/{tableId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
