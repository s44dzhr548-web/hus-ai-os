/**
 * Menu workflow QA — section + item + public menu verification.
 * Usage: npx tsx scripts/menu-workflow-qa.ts [baseUrl]
 */
const BASE = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || "https://restaurant-os-nine.vercel.app";
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "admin@menuos.sa";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

interface Result {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: Result[] = [];

function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function json(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 200) };
  }
}

async function login(email: string, password: string): Promise<string> {
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
  const sessionCookie = setCookies.map((c) => c.split(";")[0]).join("; ");
  if (!sessionCookie) throw new Error(`Login failed HTTP ${loginRes.status}`);
  return sessionCookie;
}

function authHeaders(cookie: string) {
  return { Cookie: cookie, "Content-Type": "application/json" } as Record<string, string>;
}

async function main() {
  console.log(`=== Menu Workflow QA ===\nTarget: ${BASE}\n`);

  let ownerCookie = "";
  let sectionId = "";
  let itemId = "";
  let tableId = "";
  let menuUrl = "";
  let restaurantSlug = "";

  try {
    const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const email = `qa_menu_${Date.now()}@menuos.sa`;
    const createRes = await fetch(`${BASE}/api/platform`, {
      method: "POST",
      headers: authHeaders(adminCookie),
      body: JSON.stringify({
        restaurantName: "QA Menu Workflow",
        restaurantNameAr: "مطعم تجربة المنيو",
        ownerName: "QA Owner",
        ownerEmail: email,
        phone: "+966501234567",
        plan: "PRO",
        trialDays: 30,
      }),
    });
    const created = await json(createRes);
    if (!createRes.ok) throw new Error(created.error);
    ownerCookie = await login(email, created.tempPassword);
    record("Create restaurant + owner login", true, email);
  } catch (e) {
    record("Create restaurant + owner login", false, String(e));
    process.exit(1);
  }

  try {
    const form = new FormData();
    form.append("file", new Blob([TINY_PNG], { type: "image/png" }), "steak.png");
    form.append("type", "image");
    const up = await fetch(`${BASE}/api/upload`, {
      method: "POST",
      headers: { Cookie: ownerCookie },
      body: form,
    });
    const upData = await json(up);
    if (!up.ok || !upData.url) throw new Error(upData.error);

    const secRes = await fetch(`${BASE}/api/menu/categories`, {
      method: "POST",
      headers: authHeaders(ownerCookie),
      body: JSON.stringify({
        nameAr: "الأطباق الرئيسية",
        nameEn: "Main Dishes",
        icon: "🥩",
        color: "#b45309",
      }),
    });
    const section = await json(secRes);
    if (!secRes.ok) throw new Error(section.error);
    sectionId = section.id;

    await fetch(`${BASE}/api/menu/categories`, {
      method: "PUT",
      headers: authHeaders(ownerCookie),
      body: JSON.stringify({
        id: sectionId,
        imageUrl: upData.url,
        mediaType: "IMAGE",
        previewUrl: upData.url,
      }),
    });

    const itemRes = await fetch(`${BASE}/api/menu/items`, {
      method: "POST",
      headers: authHeaders(ownerCookie),
      body: JSON.stringify({
        categoryId: sectionId,
        nameAr: "ستيك الترافليون",
        nameEn: "Truffle Steak",
        descriptionAr: "شرائح لحم مع صوص الترافل",
        descriptionEn: "Beef slices with truffle sauce",
        price: 109,
        calories: 1595,
        imageUrl: upData.url,
        mediaType: "IMAGE",
        previewUrl: upData.url,
        isAvailable: true,
      }),
    });
    const item = await json(itemRes);
    if (!itemRes.ok) throw new Error(item.error);
    itemId = item.id;

    record("Create section الأطباق الرئيسية", true, sectionId.slice(0, 8));
    record("Create item ستيك الترافليون with calories", true, `${item.calories} cal`);
  } catch (e) {
    record("Create section + item", false, String(e));
  }

  try {
    const branches = await fetch(`${BASE}/api/branches`, {
      headers: authHeaders(ownerCookie),
    }).then((r) => r.json());
    const branchId = branches[0]?.id;
    const tableRes = await fetch(`${BASE}/api/tables`, {
      method: "POST",
      headers: authHeaders(ownerCookie),
      body: JSON.stringify({ branchId, number: 88 + Math.floor(Math.random() * 900), label: "QA" }),
    });
    const table = await json(tableRes);
    if (!tableRes.ok) throw new Error(table.error || `HTTP ${tableRes.status}`);
    tableId = table.id;

    const qr = await fetch(`${BASE}/api/qr?tableId=${tableId}`, {
      headers: authHeaders(ownerCookie),
    }).then((r) => r.json());
    menuUrl = qr.menuUrl;
    restaurantSlug = qr.menuUrl?.match(/\/r\/([^/]+)/)?.[1] || "";

    record("Create table + QR", !!menuUrl, menuUrl);
  } catch (e) {
    record("Create table + QR", false, String(e));
  }

  if (tableId && sectionId && itemId) {
    try {
      const menu = await fetch(`${BASE}/api/public/menu/${tableId}`).then((r) => r.json());
      const sec = menu.categories?.find((c: { id: string }) => c.id === sectionId);
      const pubItem = sec?.items?.find((i: { id: string }) => i.id === itemId);

      record(
        "Public menu: section visible",
        !!sec && (sec.nameAr === "الأطباق الرئيسية" || sec.name === "الأطباق الرئيسية"),
        sec?.nameAr
      );
      record(
        "Public menu: item with price/description/calories",
        pubItem?.price === 109 &&
          pubItem?.calories === 1595 &&
          (pubItem?.descriptionAr?.includes("ترافل") || pubItem?.description?.includes("ترافل")),
        pubItem ? `${pubItem.price} SAR · ${pubItem.calories} cal` : "missing"
      );
      record("Public menu: item has image", !!pubItem?.imageUrl, pubItem?.imageUrl?.slice(0, 50));
    } catch (e) {
      record("Public menu verification", false, String(e));
    }
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== Menu Workflow QA: ${passed}/${results.length} ===`);
  console.log(`\nOwner menu: ${BASE}/dashboard/menu/categories`);
  if (sectionId) {
    console.log(`Section items: ${BASE}/dashboard/menu/categories/${sectionId}`);
  }
  if (menuUrl) console.log(`Customer menu: ${menuUrl}`);

  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
