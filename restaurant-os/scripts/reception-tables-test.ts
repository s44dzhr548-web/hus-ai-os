/**
 * Table icons, manual entry, minimum spend, orders & history E2E.
 * Usage: npx tsx scripts/reception-tables-test.ts [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3005";

const ADMIN_EMAIL = "admin@menuos.sa";
const ADMIN_PASSWORD = "admin123456";
const MANUAL_TABLE_NUM = 912;
const QA_PHONE = "0501112233";

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
  console.log(`=== Reception Tables E2E ===\n${BASE}\n`);

  let cookie = "";
  try {
    cookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    pass("1. Admin login");
  } catch (e) {
    fail("1. Admin login", String(e));
    printSummary();
    process.exit(1);
  }

  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const receptionPage = await fetch(`${BASE}/dashboard/reception`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if ([200, 307, 308].includes(receptionPage.status)) {
    pass("2. Reception page accessible");
  } else {
    fail("2. Reception page accessible", `HTTP ${receptionPage.status}`);
  }

  const sortRes = await fetch(`${BASE}/api/reception?sortBy=minimumSpend`, {
    headers: { Cookie: cookie },
  });
  const sortData = await json(sortRes);
  if (sortRes.ok && Array.isArray(sortData.cards)) {
    pass("3. Reception sort by minimumSpend", `${sortData.cards.length} cards`);
  } else {
    fail("3. Reception sort by minimumSpend", sortData.error);
  }

  const branchesRes = await json(await fetch(`${BASE}/api/branches`, { headers: { Cookie: cookie } }));
  const branchId = branchesRes?.[0]?.id || sortData.branches?.[0]?.id;

  const walkIn = await fetch(`${BASE}/api/reception`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerName: "Table QA Guest",
      customerPhone: QA_PHONE,
      guestCount: 2,
      branchId,
      minimumSpendAmount: 150,
      status: "SEATED",
      notes: "VIP manual table test",
      manualTable: {
        number: MANUAL_TABLE_NUM,
        label: "VIP Corner",
        tableIcon: "SOFA",
        zone: "Terrace",
        capacity: 4,
        minimumSpendAmount: 150,
        notes: "Manual QA table",
      },
    }),
  });
  const walkInData = await json(walkIn);
  const sessionId = walkInData.id;
  const tableId = walkInData.tableId;

  if (walkIn.ok && sessionId && walkInData.tableLabel === "VIP Corner") {
    pass("4. Manual table created in Reception", `table ${MANUAL_TABLE_NUM}, session ${sessionId}`);
  } else {
    fail("4. Manual table created in Reception", walkInData.error || JSON.stringify(walkInData));
  }

  if (tableId) {
    const menuRes = await fetch(`${BASE}/api/public/menu/${tableId}`);
    const menuData = await json(menuRes);
    if (
      menuRes.ok &&
      menuData.table?.label === "VIP Corner" &&
      menuData.table?.tableIcon === "SOFA" &&
      menuData.activeSession?.minimumSpendAmount === 150
    ) {
      pass("5. QR menu shows label/icon/min spend", menuData.table.tableIconEmoji || "SOFA");
    } else {
      fail(
        "5. QR menu shows label/icon/min spend",
        JSON.stringify({
          label: menuData.table?.label,
          icon: menuData.table?.tableIcon,
          min: menuData.activeSession?.minimumSpendAmount,
        })
      );
    }
  } else {
    fail("5. QR menu shows label/icon/min spend", "no tableId");
  }

  let menuItemId = "";
  if (tableId) {
    const menuRes = await fetch(`${BASE}/api/public/menu/${tableId}`);
    const menuData = await json(menuRes);
    const item =
      menuData.categories?.[0]?.items?.[0] ||
      menuData.categories?.[0]?.children?.[0]?.items?.[0] ||
      menuData.suggestedItems?.[0];
    menuItemId = item?.id;
  }

  let orderId = "";
  if (tableId && menuItemId) {
    const checkout = await fetch(`${BASE}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId,
        customerName: "Table QA Guest",
        items: [{ menuItemId, quantity: 1 }],
        method: "CASH",
      }),
    });
    const orderData = await json(checkout);
    orderId = orderData.orderId || orderData.id;
    if (
      checkout.ok &&
      orderData.tableNumber === MANUAL_TABLE_NUM &&
      orderData.tableLabel === "VIP Corner"
    ) {
      pass("6. Order stores table info", `order #${orderData.orderNumber}`);
    } else {
      const ordersRes = await fetch(`${BASE}/api/orders`, { headers: { Cookie: cookie } });
      const orders = await json(ordersRes);
      const latest = orders?.[0];
      if (
        latest?.tableNumber === MANUAL_TABLE_NUM &&
        latest?.tableLabel === "VIP Corner"
      ) {
        orderId = latest.id;
        pass("6. Order stores table info", `order #${latest.orderNumber}`);
      } else {
        fail("6. Order stores table info", JSON.stringify({ orderData, latest }));
      }
    }
  } else {
    fail("6. Order stores table info", "no menu item or table");
  }

  if (sessionId) {
    const closeRes = await fetch(`${BASE}/api/reception/${sessionId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    if (closeRes.ok) {
      pass("7. Session closed");
    } else {
      fail("7. Session closed", `HTTP ${closeRes.status}`);
    }
  } else {
    fail("7. Session closed", "skipped");
  }

  const visitsRes = await fetch(
    `${BASE}/api/customers?view=visits&phone=${QA_PHONE}`,
    { headers: { Cookie: cookie } }
  );
  const visitsData = await json(visitsRes);
  const visit = visitsData.visits?.find(
    (v: { tableNumber?: number; tableLabel?: string }) =>
      v.tableNumber === MANUAL_TABLE_NUM && v.tableLabel === "VIP Corner"
  );
  if (visit?.tableIcon === "SOFA" && visit.minimumSpendAmount === 150) {
    pass("8. Customer history stores table meta", visit.id);
  } else {
    fail(
      "8. Customer history stores table meta",
      JSON.stringify(visit || visitsData.visits?.[0])
    );
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const res1 = await fetch(`${BASE}/api/reservations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerName: "Manual Res Guest",
      customerPhone: "0502223344",
      guestCount: 2,
      date: dateStr,
      time: "19:00",
      minimumSpendAmount: 200,
      manualTable: {
        number: MANUAL_TABLE_NUM + 1,
        label: "Window Booth",
        tableIcon: "WINDOW",
        zone: "Main Hall",
        capacity: 2,
      },
    }),
  });
  const res1Data = await json(res1);
  if (res1.ok && res1Data.tableLabel === "Window Booth" && res1Data.minimumSpendAmount === 200) {
    pass("9. Reservation with manual table", res1Data.id);
  } else {
    fail("9. Reservation with manual table", res1Data.error || JSON.stringify(res1Data));
  }

  const res2 = await fetch(`${BASE}/api/reservations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerName: "Double Book Guest",
      customerPhone: "0503334455",
      guestCount: 2,
      date: dateStr,
      time: "19:30",
      tableId: res1Data.tableId,
    }),
  });
  const res2Data = await json(res2);
  if (res2.status === 409) {
    pass("10. Double booking prevented", res2Data.error);
  } else {
    fail("10. Double booking prevented", `HTTP ${res2.status}: ${res2Data.error || "allowed"}`);
  }

  const ordersPage = await fetch(`${BASE}/dashboard/orders`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if ([200, 307, 308].includes(ordersPage.status)) {
    pass("11. Orders page accessible");
  } else {
    fail("11. Orders page accessible", `HTTP ${ordersPage.status}`);
  }

  const customersPage = await fetch(`${BASE}/dashboard/customers`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if ([200, 307, 308].includes(customersPage.status)) {
    pass("12. Customer history page accessible");
  } else {
    fail("12. Customer history page accessible", `HTTP ${customersPage.status}`);
  }

  if (orderId) {
    pass("13. Order ID captured for audit", orderId);
  } else {
    fail("13. Order ID captured for audit", "none");
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== Results: ${passed}/${results.length} PASS, ${failed} FAIL ===`);
  console.log(`Reception: ${BASE}/dashboard/reception`);
  console.log(`Reservations: ${BASE}/dashboard/reservations`);
  console.log(`Customers: ${BASE}/dashboard/customers`);
  console.log(`Orders: ${BASE}/dashboard/orders`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
