/**
 * End-to-end API test for Menu OS.
 * Run: node scripts/e2e-test.mjs [baseUrl]
 * Requires: dev server running (npm run dev) and seeded/provisioned DB
 */
const BASE = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

const results = [];
function pass(name) {
  results.push({ name, ok: true });
  console.log(`✓ ${name}`);
}
function fail(name, err) {
  results.push({ name, ok: false, err: String(err) });
  console.error(`✗ ${name}: ${err}`);
}

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  console.log(`E2E test against ${BASE}\n`);

  // 1. Public routes
  for (const path of ["/", "/register", "/login", "/pricing", "/faq"]) {
    try {
      const r = await fetch(`${BASE}${path}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      pass(`GET ${path}`);
    } catch (e) {
      fail(`GET ${path}`, e);
    }
  }

  // 2. Registration
  const email = `e2e_${Date.now()}@test.menuos.sa`;
  const password = "testpass123";
  let restaurantId, branchId, sessionCookie = "";

  try {
    const r = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerName: "E2E Owner",
        email,
        password,
        restaurantName: "E2E Restaurant",
        restaurantNameAr: "مطعم تجريبي",
        branchNameAr: "فرع الاختبار",
        city: "جدة",
        phone: "+966501111111",
      }),
    });
    const data = await json(r);
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    restaurantId = data.restaurantId;
    branchId = data.branchId;
    pass("Registration API");
  } catch (e) {
    fail("Registration API", e);
  }

  // 3. Login via NextAuth credentials
  try {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    const { csrfToken } = await json(csrfRes);
    const cookies = csrfRes.headers.getSetCookie?.() || [];

    const body = new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${BASE}/dashboard`,
      json: "true",
    });

    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies.map((c) => c.split(";")[0]).join("; "),
      },
      body,
      redirect: "manual",
    });
    const setCookies = loginRes.headers.getSetCookie?.() || [];
    sessionCookie = setCookies.map((c) => c.split(";")[0]).join("; ");
    if (!sessionCookie && loginRes.status !== 200) {
      throw new Error(`Login failed HTTP ${loginRes.status}`);
    }
    pass("Login (NextAuth)");
  } catch (e) {
    fail("Login (NextAuth)", e);
  }

  const authHeaders = sessionCookie
    ? { Cookie: sessionCookie, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  // 4. Restaurant setup — category + menu item
  let categoryId = "";
  try {
    const r = await fetch(`${BASE}/api/menu/categories`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ nameAr: "مقبلات", nameEn: "Appetizers" }),
    });
    const data = await json(r);
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    categoryId = data.id;
    pass("Restaurant setup — create category");
  } catch (e) {
    fail("Restaurant setup — create category", e);
  }

  try {
    const r = await fetch(`${BASE}/api/menu/items`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        categoryId,
        nameAr: "قهوة",
        nameEn: "Coffee",
        price: 15,
        isAvailable: true,
      }),
    });
    const data = await json(r);
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    pass("Restaurant setup — create menu item");
  } catch (e) {
    fail("Restaurant setup — create menu item", e);
  }

  // 5. Upgrade to PRO for 100 tables
  try {
    const r = await fetch(`${BASE}/api/subscription`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ plan: "PRO" }),
    });
    const data = await json(r);
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    pass("Subscription upgrade to PRO");
  } catch (e) {
    fail("Subscription upgrade to PRO", e);
  }

  // 6. Create 100 tables
  let tableId = "";
  try {
    const r = await fetch(`${BASE}/api/tables`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ bulk: true, branchId, count: 100, startNumber: 1 }),
    });
    const data = await json(r);
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    if (!data.created?.length) throw new Error("No tables created");
    tableId = data.created[0].id;
    pass(`Bulk create ${data.count} tables`);
  } catch (e) {
    fail("Bulk create 100 tables", e);
  }

  // 7. QR generation
  try {
    const r = await fetch(`${BASE}/api/qr?tableId=${tableId}`, { headers: authHeaders });
    const data = await json(r);
    if (!r.ok || !data.qrDataUrl) throw new Error(data.error || "No QR data");
    if (!data.menuUrl?.includes("/r/") && !data.menuUrl?.includes("/menu/")) {
      throw new Error(`Invalid menuUrl: ${data.menuUrl}`);
    }
    pass("QR generation (single table)");
  } catch (e) {
    fail("QR generation", e);
  }

  // 8. QR bulk list
  try {
    const r = await fetch(`${BASE}/api/qr`, { headers: authHeaders });
    const data = await json(r);
    if (!r.ok || !data.tables?.length) throw new Error("No tables in QR export");
    pass(`QR bulk export (${data.tables.length} tables)`);
  } catch (e) {
    fail("QR bulk export", e);
  }

  // 9. Customer menu
  try {
    const r = await fetch(`${BASE}/api/public/menu/${tableId}`);
    const data = await json(r);
    if (!r.ok || !data.categories) throw new Error(data.error || "No menu");
    pass("Customer menu API");
  } catch (e) {
    fail("Customer menu API", e);
  }

  // 10. Checkout / order
  let orderId = "";
  try {
    const menuRes = await fetch(`${BASE}/api/public/menu/${tableId}`);
    const menu = await json(menuRes);
    const item =
      menu.categories?.[0]?.items?.[0] ||
      menu.categories?.[0]?.children?.[0]?.items?.[0];
    if (!item) throw new Error("No menu items for checkout");

    const r = await fetch(`${BASE}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId,
        items: [{ menuItemId: item.id, quantity: 1 }],
        method: "MADA",
        customerName: "E2E Customer",
        customerPhone: "0501111111",
      }),
    });
    const data = await json(r);
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    orderId = data.orderId;
    pass("Checkout / order creation");
  } catch (e) {
    fail("Checkout / order creation", e);
  }

  // 11. Order status (public)
  if (orderId) {
    try {
      const r = await fetch(`${BASE}/api/public/orders/${orderId}`);
      const data = await json(r);
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      pass("Order status API");
    } catch (e) {
      fail("Order status API", e);
    }
  }

  // 12. Kitchen — list orders
  try {
    const r = await fetch(`${BASE}/api/orders?status=NEW`, { headers: authHeaders });
    const data = await json(r);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    pass(`Kitchen orders list (${Array.isArray(data) ? data.length : 0} NEW)`);
  } catch (e) {
    fail("Kitchen orders list", e);
  }

  // 13. Kitchen — update status
  if (orderId) {
    try {
      const r = await fetch(`${BASE}/api/orders`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ id: orderId, status: "PREPARING" }),
      });
      if (!r.ok) {
        const data = await json(r);
        throw new Error(data.error || `HTTP ${r.status}`);
      }
      pass("Kitchen status update");
    } catch (e) {
      fail("Kitchen status update", e);
    }
  }

  // 14. Payment settings
  try {
    const r = await fetch(`${BASE}/api/restaurants/payment-settings`, {
      headers: authHeaders,
    });
    const data = await json(r);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    pass("Payment settings API");
  } catch (e) {
    fail("Payment settings API", e);
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n=== ${passed}/${total} passed ===`);
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
