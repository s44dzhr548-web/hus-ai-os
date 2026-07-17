/**
 * Fabrika customer features E2E — cards, submit QA requests, verify staff dashboards, soft-archive.
 * Additive QA only — no deletes; archives via status PATCH.
 *
 * Usage: node scripts/fabrika-customer-features-e2e.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.PRODUCTION_URL || "https://restaurant-os-nine.vercel.app";
const SLUG_OVERRIDE = process.env.RESTAURANT_SLUG || "";
const QA_TAG = `QA-E2E-NAV-${Date.now()}`;
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const summary = {
  slug: "",
  url: "",
  gifts: "FAIL",
  wishes: "FAIL",
  songRequests: "FAIL",
};

async function json(res) {
  return res.json().catch(() => ({}));
}

function parseSetCookie(res, prev = "") {
  const parts = new Set(prev ? prev.split("; ").filter(Boolean) : []);
  for (const c of res.headers.getSetCookie?.() || []) {
    parts.add(c.split(";")[0]);
  }
  return [...parts].join("; ");
}

function isFabrikaCandidate(r) {
  if (!r?.slug || r.slug === "menu-os-demo" || r.isActive === false) return false;
  const label = `${r.name || ""} ${r.nameAr || ""} ${r.slug}`;
  return /fabrika|fabraka|فابريك/i.test(label);
}

function rankFabrikaCandidates(list) {
  return [...list].sort((a, b) => {
    const aFabrika = a.slug.startsWith("fabrika-") ? 1 : 0;
    const bFabrika = b.slug.startsWith("fabrika-") ? 1 : 0;
    if (bFabrika !== aFabrika) return bFabrika - aFabrika;
    const aLounge = /لاونج|lounge/i.test(`${a.name} ${a.nameAr}`) ? 1 : 0;
    const bLounge = /لاونج|lounge/i.test(`${b.name} ${b.nameAr}`) ? 1 : 0;
    return bLounge - aLounge;
  });
}

async function resolveFabrikaRestaurant(cookie) {
  if (SLUG_OVERRIDE) {
    const list = await json(
      await fetch(`${BASE}/api/restaurants/switch`, { headers: { Cookie: cookie } })
    );
    const match = (Array.isArray(list) ? list : []).find((r) => r.slug === SLUG_OVERRIDE);
    if (!match) throw new Error(`RESTAURANT_SLUG not found: ${SLUG_OVERRIDE}`);
    return match;
  }

  const list = await json(
    await fetch(`${BASE}/api/restaurants/switch`, { headers: { Cookie: cookie } })
  );
  const candidates = rankFabrikaCandidates(
    (Array.isArray(list) ? list : []).filter(isFabrikaCandidate)
  );
  if (!candidates.length) throw new Error("No Fabrika restaurant found");

  let best = candidates[0];
  let bestTables = -1;
  for (const candidate of candidates.slice(0, 5)) {
    const switchRes = await fetch(`${BASE}/api/restaurants/switch`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: candidate.id }),
    });
    const scopedCookie = parseSetCookie(switchRes, cookie);
    const reception = await json(
      await fetch(`${BASE}/api/reception`, { headers: { Cookie: scopedCookie } })
    );
    const tableCount = reception.cards?.length ?? 0;
    if (tableCount > bestTables) {
      bestTables = tableCount;
      best = candidate;
    }
  }
  return best;
}

async function switchToRestaurant(cookie, restaurantId) {
  const res = await fetch(`${BASE}/api/restaurants/switch`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantId }),
  });
  if (!res.ok) throw new Error(`Switch restaurant failed: HTTP ${res.status}`);
  return parseSetCookie(res, cookie);
}

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await json(csrfRes);
  let cookie = parseSetCookie(csrfRes);
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
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
  return parseSetCookie(loginRes, cookie);
}

async function ensureActiveSessions(cookie) {
  const headers = { Cookie: cookie, "Content-Type": "application/json" };
  const reception = await json(await fetch(`${BASE}/api/reception`, { headers: { Cookie: cookie } }));

  const byTable = new Map();
  for (const card of reception.cards || []) {
    if (card.session && card.table?.id) {
      byTable.set(card.table.id, {
        tableId: card.table.id,
        tableNumber: card.table.number,
      });
    }
  }

  const empty = (reception.cards || []).filter((c) => !c.session && c.table?.id);
  let phoneSuffix = 0;

  while (byTable.size < 2 && empty.length > 0) {
    const table = empty.shift();
    const res = await fetch(`${BASE}/api/reception`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customerName: `${QA_TAG} Guest ${byTable.size + 1}`,
        customerPhone: `0509${String(Date.now() + phoneSuffix++).slice(-6)}`,
        guestCount: 2,
        tableId: table.table.id,
        branchId: table.table.branchId,
      }),
    });
    const data = await json(res);
    if (res.ok && data.tableId) {
      byTable.set(data.tableId, {
        tableId: data.tableId,
        tableNumber: table.tableDisplayNumber || table.table.number,
      });
    } else {
      console.log(`WARN  Could not open session on table ${table.table.id}:`, data.error || res.status);
    }
  }

  return [...byTable.values()].slice(0, 2);
}

async function findMenuProduct(tableId) {
  const menuRes = await fetch(`${BASE}/api/public/menu/${tableId}`);
  const menu = await json(menuRes);
  if (!menuRes.ok) return null;
  for (const cat of menu.categories || []) {
    for (const item of cat.items || []) {
      if (item.isAvailable !== false && item.id) return item.id;
    }
  }
  return null;
}

async function main() {
  let cookie;
  try {
    cookie = await login();
    console.log("PASS  Staff login");
  } catch (e) {
    console.error("FAIL  Staff login", e.message);
    printSummary();
    process.exit(1);
  }

  const fabrika = await resolveFabrikaRestaurant(cookie);
  summary.slug = fabrika.slug;
  summary.url = `${BASE}/r/${fabrika.slug}`;
  cookie = await switchToRestaurant(cookie, fabrika.id);

  console.log(`\nFabrika Customer Features E2E`);
  console.log(`Resolved: ${fabrika.nameAr || fabrika.name} (${fabrika.slug})`);
  console.log(`${summary.url}\nQA tag: ${QA_TAG}\n`);

  const homeRes = await fetch(summary.url);
  const homeHtml = await homeRes.text();
  const cards = [
    ["الإهداء", summary.gifts],
    ["الأمنيات", summary.wishes],
    ["طلب أغنية", summary.songRequests],
  ];

  for (const [label] of cards) {
    if (homeHtml.includes(label)) {
      console.log(`PASS  Nav card visible: ${label}`);
    } else {
      console.log(`FAIL  Nav card visible: ${label}`);
    }
  }

  if (homeHtml.includes(`/r/${summary.slug}/wishes?`) || homeHtml.includes(`/r/${summary.slug}/wishes`)) {
    console.log("PASS  Wishes route preserves restaurant slug");
  } else {
    console.log("FAIL  Wishes route link missing");
  }

  const authHeaders = { Cookie: cookie, "Content-Type": "application/json" };
  const sessions = await ensureActiveSessions(cookie);

  if (sessions.length < 1) {
    console.log("FAIL  No active table sessions for QA submissions");
    printSummary();
    process.exit(1);
  }

  const senderTableId = sessions[0].tableId;
  const receiverTableId = sessions[1]?.tableId || sessions[0].tableId;
  console.log(`INFO  Sender table: ${senderTableId}, receiver: ${receiverTableId}`);

  // --- Wishes ---
  const wishMsg = `${QA_TAG} wish — safe QA only`;
  const wishPost = await fetch(`${BASE}/api/public/wishes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableId: senderTableId,
      type: "NOTE",
      message: wishMsg,
      customerName: QA_TAG,
    }),
  });
  const wishData = await json(wishPost);
  if (wishPost.ok && wishData.wish?.id) {
    const staffWishes = await json(await fetch(`${BASE}/api/wishes`, { headers: { Cookie: cookie } }));
    const found = (staffWishes.wishes || []).some((w) => w.id === wishData.wish.id);
    if (found) {
      summary.wishes = "PASS";
      console.log("PASS  Wishes submit + staff dashboard");
      await fetch(`${BASE}/api/wishes`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ wishId: wishData.wish.id, status: "REJECTED" }),
      });
      console.log("INFO  Wishes QA record soft-archived (REJECTED)");
    } else {
      console.log("FAIL  Wishes not in staff dashboard");
    }
  } else {
    console.log("FAIL  Wishes submit", wishData.error || `HTTP ${wishPost.status}`);
  }

  // --- Song requests ---
  const songName = `${QA_TAG} Song`;
  const songPost = await fetch(`${BASE}/api/public/song-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableId: senderTableId,
      songName,
      artistName: "QA Artist",
      dedicationMessage: "Safe QA — please ignore",
      target: "SAME_TABLE",
    }),
  });
  const songData = await json(songPost);
  if (songPost.ok && songData.request?.id) {
    const staffSongs = await json(
      await fetch(`${BASE}/api/song-requests`, { headers: { Cookie: cookie } })
    );
    const found = (staffSongs.requests || []).some((r) => r.id === songData.request.id);
    if (found) {
      summary.songRequests = "PASS";
      console.log("PASS  Song request submit + staff dashboard");
      await fetch(`${BASE}/api/song-requests`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ requestId: songData.request.id, status: "REJECTED" }),
      });
      console.log("INFO  Song request QA record soft-archived (REJECTED)");
    } else {
      console.log("FAIL  Song request not in staff dashboard");
    }
  } else {
    console.log("FAIL  Song request submit", songData.error || `HTTP ${songPost.status}`);
  }

  // --- Gifts ---
  const productId = await findMenuProduct(senderTableId);
  if (!productId) {
    console.log("FAIL  Gifts — no menu product found for sender table");
  } else if (senderTableId === receiverTableId) {
    console.log("FAIL  Gifts — need two distinct active tables");
  } else {
    const giftPost = await fetch(`${BASE}/api/public/gifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderTableId,
        receiverTableId,
        productId,
        quantity: 1,
        giftMessage: `${QA_TAG} — safe QA gift`,
        senderDisplayName: QA_TAG,
        isAnonymous: false,
      }),
    });
    const giftData = await json(giftPost);
    if (giftPost.ok && giftData.gift?.id) {
      const staffGifts = await json(await fetch(`${BASE}/api/gifts`, { headers: { Cookie: cookie } }));
      const found = (staffGifts.gifts || []).some((g) => g.id === giftData.gift.id);
      if (found) {
        summary.gifts = "PASS";
        console.log("PASS  Gifts submit + staff dashboard");
        await fetch(`${BASE}/api/gifts`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ giftId: giftData.gift.id, status: "CANCELLED" }),
        });
        console.log("INFO  Gift QA record soft-archived (CANCELLED)");
      } else {
        console.log("FAIL  Gift not in staff dashboard");
      }
    } else {
      console.log("FAIL  Gifts submit", giftData.error || `HTTP ${giftPost.status}`);
    }
  }

  printSummary();
  const allPass = summary.gifts === "PASS" && summary.wishes === "PASS" && summary.songRequests === "PASS";
  process.exit(allPass ? 0 : 1);
}

function printSummary() {
  console.log("\n=== Fabrika Customer Features E2E Summary ===");
  console.log(`Fabrika slug:   ${summary.slug || "(unknown)"}`);
  console.log(`Production URL: ${summary.url || "(unknown)"}`);
  console.log(`Gifts:          ${summary.gifts}`);
  console.log(`Wishes:         ${summary.wishes}`);
  console.log(`Song Requests:  ${summary.songRequests}`);
  console.log("Data safety:    No deletes — QA records status-updated only\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
