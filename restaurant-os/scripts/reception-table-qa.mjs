#!/usr/bin/env node
/**
 * Reception check-in + table normalization QA
 * Usage: node scripts/reception-table-qa.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.QA_BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const results = { reception: [], normalization: [] };
function record(suite, name, ok, detail = "") {
  results[suite].push({ name, ok, detail });
  const tag = suite === "reception" ? "RECEPTION" : "NORMALIZE";
  console.log(`${ok ? "PASS" : "FAIL"} | ${tag} | ${name}${detail ? ` | ${detail}` : ""}`);
}

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
  return {
    cookie: [
      ...cookies.map((c) => c.split(";")[0]),
      ...(loginRes.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]),
    ].join("; "),
  };
}

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log(`\n=== Reception + Table Normalization QA ===`);
  console.log(`URL: ${BASE}\n`);

  let cookie = "";
  try {
    ({ cookie } = await login());
    record("reception", "Login", !!cookie);
    record("normalization", "Login", !!cookie);
  } catch (e) {
    record("reception", "Login", false, String(e.message));
    process.exit(1);
  }

  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const branches = await json(await fetch(`${BASE}/api/branches`, { headers }));
  const branchId = Array.isArray(branches) && branches[0]?.id;
  record("reception", "Branches API", !!branchId);
  record("normalization", "Branches API", !!branchId);

  const receptionBefore = await json(
    await fetch(`${BASE}/api/reception${branchId ? `?branchId=${branchId}` : ""}`, { headers })
  );
  record("reception", "Reception API has presentGuests", Array.isArray(receptionBefore.presentGuests));

  const tablesRes = await json(
    await fetch(`${BASE}/api/tables${branchId ? `?branchId=${branchId}` : ""}`, { headers })
  );
  const tables = Array.isArray(tablesRes) ? tablesRes : tablesRes.tables || [];
  const baseTable = tables.find((t) => t.isActive !== false) || tables[0];
  record("reception", "Tables available", tables.length > 0, `count=${tables.length}`);

  const stamp = Date.now();
  const resCreate = await fetch(`${BASE}/api/reservations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerName: `QA Guest ${stamp}`,
      customerPhone: `05${String(stamp).slice(-8)}`,
      guestCount: 2,
      date: todayIso(),
      time: "20:00",
      branchId,
    }),
  });
  const created = await json(resCreate);
  const reservationId = created.id || created.reservation?.id;
  record("reception", "Create reservation", resCreate.ok && !!reservationId, reservationId || "");

  if (reservationId && baseTable) {
    const assignRes = await fetch(`${BASE}/api/reservations/${reservationId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        action: "assign_table",
        tableId: baseTable.id,
      }),
    });
    const assignData = await json(assignRes);
    record(
      "reception",
      "Assign table sets CHECKED_IN",
      assignRes.ok && (assignData.reservation?.status === "CHECKED_IN" || assignData.status === "CHECKED_IN"),
      assignData.reservation?.status || assignData.status || assignRes.status
    );
    record(
      "reception",
      "Assign returns presentGuests",
      Array.isArray(assignData.presentGuests),
      `count=${assignData.presentGuests?.length ?? 0}`
    );

    const inPresent = (assignData.presentGuests || []).some(
      (g) => g.id === reservationId || g.reservationId === reservationId
    );
    record("reception", "Guest in presentGuests after assign", inPresent);

    const receptionAfter = await json(
      await fetch(`${BASE}/api/reception${branchId ? `?branchId=${branchId}` : ""}`, { headers })
    );
    const inReception = (receptionAfter.presentGuests || []).some(
      (g) => g.id === reservationId || g.reservationId === reservationId
    );
    record("reception", "Guest visible in GET /api/reception", inReception);

    const seatRes = await fetch(`${BASE}/api/reservations/${reservationId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "seat", tableId: baseTable.id }),
    });
    const seatData = await json(seatRes);
    record(
      "reception",
      "Seat creates session",
      seatRes.ok && !!seatData.session,
      seatData.reservation?.status || ""
    );

    const seatedPresent = (seatData.presentGuests || []).find(
      (g) => g.id === reservationId || g.reservationId === reservationId
    );
    record(
      "reception",
      "Seated guest in seated section",
      seatedPresent?.displaySection === "seated",
      seatedPresent?.displaySection || ""
    );

    if (seatData.session?.id) {
      await fetch(`${BASE}/api/reception/${seatData.session.id}`, {
        method: "DELETE",
        headers,
      });
    }
  }

  if (branchId) {
    const uniqueBase = 88000 + (stamp % 1000);
    const variants = [
      String(uniqueBase),
      String(uniqueBase).replace(/1/g, "١").replace(/2/g, "٢").replace(/3/g, "٣"),
      `طاولة ${uniqueBase}`,
      `TABLE-${uniqueBase}`,
    ];

    const firstRes = await fetch(`${BASE}/api/tables`, {
      method: "POST",
      headers,
      body: JSON.stringify({ branchId, number: variants[0], label: `QA ${uniqueBase}` }),
    });
    const first = await json(firstRes);
    record("normalization", "Create base table", firstRes.ok, variants[0]);

    for (let i = 1; i < variants.length; i++) {
      const dupRes = await fetch(`${BASE}/api/tables`, {
        method: "POST",
        headers,
        body: JSON.stringify({ branchId, number: variants[i], label: `QA dup ${i}` }),
      });
      const dupData = await json(dupRes);
      record(
        "normalization",
        `Block duplicate variant: ${variants[i]}`,
        dupRes.status === 400 || dupRes.status === 409,
        dupData.error || dupRes.status
      );
    }

    const otherBranch = Array.isArray(branches) && branches[1]?.id;
    if (otherBranch) {
      const crossRes = await fetch(`${BASE}/api/tables`, {
        method: "POST",
        headers,
        body: JSON.stringify({ branchId: otherBranch, number: variants[0], label: "Cross branch" }),
      });
      record(
        "normalization",
        "Cross-branch same number allowed",
        crossRes.ok,
        String(crossRes.status)
      );
      if (crossRes.ok) {
        const cross = await json(crossRes);
        if (cross.id) {
          await fetch(`${BASE}/api/tables`, {
            method: "DELETE",
            headers,
            body: JSON.stringify({ id: cross.id }),
          }).catch(() => {});
        }
      }
    }

    if (first.id) {
      await fetch(`${BASE}/api/tables`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ id: first.id }),
      }).catch(() => {});
    }
  }

  const dupReport = await json(await fetch(`${BASE}/api/tables/duplicates`, { headers }));
  record(
    "normalization",
    "Duplicates report API",
    dupReport.groups != null,
    `groups=${dupReport.groups?.length ?? 0}`
  );

  const recPass = results.reception.filter((r) => r.ok).length;
  const recFail = results.reception.filter((r) => !r.ok).length;
  const normPass = results.normalization.filter((r) => r.ok).length;
  const normFail = results.normalization.filter((r) => !r.ok).length;

  console.log(`\n--- Reception QA: ${recFail === 0 ? "PASS" : "FAIL"} (${recPass}/${recPass + recFail})`);
  console.log(`--- Normalization QA: ${normFail === 0 ? "PASS" : "FAIL"} (${normPass}/${normPass + normFail})`);

  process.exit(recFail + normFail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
