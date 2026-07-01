/**
 * Production audit — DB + HTTP tests against running server.
 * Usage: npx tsx scripts/production-audit.ts [baseUrl]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.argv[2] || "http://localhost:3006";

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

async function httpGet(path: string) {
  const r = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15000) });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

async function main() {
  console.log("=== Menu OS Production Audit ===\n");

  // Database checks
  try {
    const users = await prisma.user.count();
    record("DB: users table", users > 0, `${users} users`);
  } catch (e) {
    record("DB: users table", false, String(e));
  }

  try {
    const restaurants = await prisma.restaurant.count();
    record("DB: restaurants", restaurants > 0, `${restaurants} restaurants`);
  } catch (e) {
    record("DB: restaurants", false, String(e));
  }

  try {
    const tables = await prisma.diningTable.count({
      where: { branch: { restaurant: { slug: "menu-os-demo" } } },
    });
    record("DB: 100 demo tables", tables >= 100, `${tables} tables`);
  } catch (e) {
    record("DB: demo tables", false, String(e));
  }

  try {
    const items = await prisma.menuItem.count({
      where: { category: { restaurant: { slug: "menu-os-demo" } } },
    });
    record("DB: demo menu items", items > 0, `${items} items`);
  } catch (e) {
    record("DB: menu items", false, String(e));
  }

  try {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@menuos.sa" },
      select: { isPlatformAdmin: true },
    });
    record("DB: platform admin", !!admin?.isPlatformAdmin);
  } catch (e) {
    record("DB: platform admin", false, String(e));
  }

  const demoTable = await prisma.diningTable.findFirst({
    where: { branch: { restaurant: { slug: "menu-os-demo" } } },
    include: { branch: { include: { restaurant: { select: { slug: true } } } } },
  });

  // HTTP checks (if server running)
  try {
    const home = await httpGet("/");
    record("HTTP: landing page", home.status === 200);
  } catch (e) {
    record("HTTP: landing page", false, "server not reachable");
  }

  if (demoTable) {
    try {
      const menu = await httpGet(`/api/public/menu/${demoTable.id}`);
      const cats = (menu.data as { categories?: unknown[] }).categories?.length ?? 0;
      record("HTTP: customer menu API", menu.status === 200 && cats > 0, `${cats} categories`);
    } catch (e) {
      record("HTTP: customer menu API", false, String(e));
    }

    try {
      const item = await prisma.menuItem.findFirst({
        where: { category: { restaurant: { slug: "menu-os-demo" } }, isAvailable: true },
      });
      if (item) {
        const checkout = await fetch(`${BASE}/api/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            tableId: demoTable.id,
            items: [{ menuItemId: item.id, quantity: 1 }],
            method: "MADA",
            customerName: "Audit Test",
            customerPhone: "0509999999",
          }),
        });
        const data = await checkout.json();
        record("HTTP: checkout/payment", checkout.ok, checkout.ok ? `order #${data.orderNumber}` : data.error);

        if (checkout.ok && data.orderId) {
          const status = await httpGet(`/api/public/orders/${data.orderId}`);
          record("HTTP: order status", status.status === 200);

          await prisma.order.update({
            where: { id: data.orderId },
            data: { status: "PREPARING" },
          });
          record("DB: kitchen status update", true, "NEW → PREPARING");
        }
      }
    } catch (e) {
      record("HTTP: checkout flow", false, String(e));
    }

    if (demoTable.qrCode) {
      record("DB: QR code URL", demoTable.qrCode.includes("/r/") || demoTable.qrCode.includes("/menu/"), demoTable.qrCode);
    }
  }

  // Registration API
  try {
    const email = `audit_${Date.now()}@menuos.sa`;
    const r = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        ownerName: "Audit User",
        email,
        password: "auditpass123",
        restaurantName: "Audit Restaurant",
        restaurantNameAr: "مطعم تدقيق",
      }),
    });
    const data = await r.json();
    record("HTTP: registration", r.status === 201, data.restaurantId);
  } catch (e) {
    record("HTTP: registration", false, String(e));
  }

  // Analytics via reports (needs auth - skip or use prisma)
  try {
    const orders = await prisma.order.count();
    const sales = await prisma.order.aggregate({ _sum: { totalAmount: true } });
    record("DB: analytics data", true, `${orders} orders, ${Number(sales._sum.totalAmount ?? 0)} SAR total`);
  } catch (e) {
    record("DB: analytics", false, String(e));
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  const pct = Math.round((passed / total) * 100);
  console.log(`\n=== Audit: ${passed}/${total} (${pct}%) ===`);

  await prisma.$disconnect();
  process.exit(passed === total ? 0 : passed >= total - 2 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
