/**
 * Reception session edit E2E tests.
 * Usage: npx tsx scripts/reception-edit-test.ts [baseUrl]
 */
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

const ADMIN_EMAIL = "admin@menuos.sa";
const ADMIN_PASSWORD = "admin123456";
const QA_PHONE = "0504445566";

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
  console.log(`=== Reception Edit E2E ===\n${BASE}\n`);

  let cookie = "";
  try {
    cookie = await login();
    pass("1. Admin login");
  } catch (e) {
    fail("1. Admin login", String(e));
    printSummary();
    process.exit(1);
  }

  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const pageRes = await fetch(`${BASE}/dashboard/reception`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  if ([200, 307, 308].includes(pageRes.status)) pass("2. Reception page");
  else fail("2. Reception page", `HTTP ${pageRes.status}`);

  const reception = await json(
    await fetch(`${BASE}/api/reception`, { headers: { Cookie: cookie } })
  );
  const branchId = reception.branches?.[0]?.id;

  const createRes = await fetch(`${BASE}/api/reception`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerName: "Edit QA Guest",
      customerPhone: QA_PHONE,
      guestCount: 2,
      branchId,
      minimumSpendAmount: 100,
      manualTable: {
        number: "VIP-01",
        label: "VIP Corner",
        zone: "Garden",
        tableIcon: "SOFA",
      },
    }),
  });
  const created = await json(createRes);
  const sessionId = created.id;
  const occupiedTableId = created.tableId;

  if (createRes.ok && created.tableDisplayNumber === "VIP-01") {
    pass("3. Manual table VIP-01 created", sessionId);
  } else {
    fail("3. Manual table VIP-01 created", created.error || JSON.stringify(created));
  }

  if (sessionId) {
    const emptyForConflict = reception.cards?.find(
      (c: { session: unknown; table: { id: string } }) =>
        !c.session && c.table.id !== occupiedTableId
    );
    if (emptyForConflict?.table?.id && occupiedTableId) {
      const mover = await json(
        await fetch(`${BASE}/api/reception`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            customerName: "Conflict B",
            customerPhone: "0501111002",
            tableId: emptyForConflict.table.id,
          }),
        })
      );
      if (mover.id) {
        const moveRes = await fetch(`${BASE}/api/reception/${mover.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ tableId: occupiedTableId }),
        });
        const moveData = await json(moveRes);
        if (moveRes.status === 409 && moveData.code === "TABLE_OCCUPIED") {
          pass("4. Active table conflict warning", moveData.conflictCustomerName);
        } else {
          fail("4. Active table conflict warning", `HTTP ${moveRes.status}`);
        }
        await fetch(`${BASE}/api/reception/${mover.id}`, {
          method: "DELETE",
          headers: { Cookie: cookie },
        });
      } else {
        fail("4. Active table conflict warning", "setup failed");
      }
    } else {
      fail("4. Active table conflict warning", "no empty table for setup");
    }

    const editRes = await fetch(`${BASE}/api/reception/${sessionId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        customerName: "Edit QA Updated",
        customerPhone: "0504445577",
        guestCount: 4,
        minimumSpendAmount: 150,
        notes: "Updated by QA",
        status: "ORDERING",
        manualTable: {
          tableNumber: "Garden-5",
          label: "Garden Table",
          zone: "Outdoor",
        },
      }),
    });
    const edited = await json(editRes);
    if (
      editRes.ok &&
      edited.session?.customerName === "Edit QA Updated" &&
      edited.session?.minimumSpendAmount === 150 &&
      edited.session?.tableDisplayNumber === "Garden-5"
    ) {
      pass("5. Session edited (name, min spend, table move)", edited.session.tableTitle);
    } else {
      fail("5. Session edited", JSON.stringify(edited));
    }

    const auditRes = await fetch(`${BASE}/api/reception/${sessionId}`, {
      headers: { Cookie: cookie },
    });
    const auditData = await json(auditRes);
    if (auditRes.ok && auditData.auditLogs?.length > 0) {
      pass("6. Audit log recorded", `${auditData.auditLogs.length} entries`);
    } else {
      fail("6. Audit log recorded", JSON.stringify(auditData.auditLogs));
    }

    const closeRes = await fetch(`${BASE}/api/reception/${sessionId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    if (closeRes.ok) pass("7. Session closed");
    else fail("7. Session closed", `HTTP ${closeRes.status}`);

    const visits = await json(
      await fetch(`${BASE}/api/customers?view=visits&phone=0504445577`, {
        headers: { Cookie: cookie },
      })
    );
    const visit = visits.visits?.[0];
    if (visit?.tableDisplayNumber === "Garden-5" && visit?.minimumSpendAmount === 150) {
      pass("8. Customer history saved final table", visit.id);
    } else {
      fail("8. Customer history saved", JSON.stringify(visit));
    }

    if (visit?.previousTables?.length > 0) {
      pass("9. Previous table recorded on move", visit.previousTables[0].tableDisplayNumber);
    } else {
      fail("9. Previous table recorded", "none");
    }
  } else {
    fail("4. Active table conflict warning", "skipped");
    fail("5. Session edited", "skipped");
    fail("6. Audit log recorded", "skipped");
    fail("7. Session closed", "skipped");
    fail("8. Customer history saved", "skipped");
    fail("9. Previous table recorded", "skipped");
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${passed}/${results.length} PASS, ${failed} FAIL ===`);
  console.log(`Reception: ${BASE}/dashboard/reception`);
  console.log(`Customers: ${BASE}/dashboard/customers`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
