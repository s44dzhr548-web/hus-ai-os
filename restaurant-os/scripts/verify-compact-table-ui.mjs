#!/usr/bin/env node
const BASE = process.argv[2] || "https://restaurant-os-nine.vercel.app";

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.map((c) => c.split(";")[0]).join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email: "admin@menuos.sa",
      password: "admin123456",
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
  const cookie = await login();
  const headers = { Cookie: cookie };

  const pageRes = await fetch(`${BASE}/dashboard/reservations`, { headers });
  const html = await pageRes.text();

  const chunkUrls = [...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]);
  let bundle = "";
  for (const url of chunkUrls) {
    try {
      const jsRes = await fetch(`${BASE}${url}`, { headers });
      const text = await jsRes.text();
      if (text.includes("reservationNumber") || text.includes("compact-table") || text.includes("\u062C\u062F\u0648\u0644")) {
        bundle += text;
      }
    } catch {
      /* skip */
    }
  }
  if (!bundle) bundle = html;

  const histHtml = await (await fetch(`${BASE}/dashboard/reservations/history`, { headers })).text();
  const all = await fetch(`${BASE}/api/reservations?mode=all&quick=full&pageSize=1`, { headers }).then((r) =>
    r.json()
  );
  const sample = all.reservations?.[0];
  const detail = sample
    ? await fetch(`${BASE}/api/reservations/${sample.id}`, { headers }).then((r) => r.json())
    : null;

  const drawerFields = [
    "createdDateDisplay",
    "sourceLabel",
    "branchName",
    "minimumSpendAmount",
    "arrivedAt",
    "seatedAt",
    "sessionEndedAt",
    "notes",
  ];

  const results = {
    compactTableLabel: bundle.includes("\u062C\u062F\u0648\u0644 \u0645\u062E\u062A\u0635\u0631"),
    fullTableLabel: bundle.includes("\u062C\u062F\u0648\u0644 \u0643\u0627\u0645\u0644"),
    customerCombinedCol: bundle.includes("\u0627\u0644\u0639\u0645\u064A\u0644 \u0648\u0627\u0644\u062C\u0648\u0627\u0644"),
    tableFixedLayout: bundle.includes("table-fixed"),
    compactNoScroll: bundle.includes("overflow-hidden"),
    sevenColumnHeaders:
      bundle.includes("\u0631\u0642\u0645 \u0627\u0644\u062D\u062C\u0632") &&
      bundle.includes("\u0627\u0644\u0625\u062C\u0631\u0627\u0621"),
    historyNotRedirect: !histHtml.includes("customers?tab=reservations"),
    detailDrawer: detail
      ? drawerFields.every((f) => f in detail.reservation) && Array.isArray(detail.statusHistory)
      : false,
    fabrikaCount: all.pagination?.total,
  };

  const pass =
    results.compactTableLabel &&
    results.customerCombinedCol &&
    results.tableFixedLayout &&
    results.compactNoScroll &&
    results.sevenColumnHeaders &&
    results.historyNotRedirect &&
    results.detailDrawer;

  console.log(JSON.stringify(results, null, 2));
  console.log(`\nCompact table UI QA: ${pass ? "PASS" : "FAIL"}`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
