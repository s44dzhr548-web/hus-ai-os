/**
 * Summarize production accounts as a table (no password hashes).
 */
import { PrismaClient } from "@prisma/client";

const BASE = "https://restaurant-os-nine.vercel.app";
const prisma = new PrismaClient();

function menuUrl(tableId: string, slug: string, tableCode: string | null) {
  if (slug && tableCode) return `${BASE}/r/${slug}/table/${tableCode}`;
  return `${BASE}/menu/${tableId}`;
}

function dashboardUrl(isPlatformAdmin: boolean) {
  return isPlatformAdmin ? `${BASE}/dashboard/platform` : `${BASE}/dashboard`;
}

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      isPlatformAdmin: true,
      createdAt: true,
      restaurants: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          slug: true,
          isActive: true,
          branches: {
            select: {
              tables: {
                orderBy: { number: "asc" },
                take: 1,
                select: { id: true, tableCode: true, number: true },
              },
            },
          },
        },
      },
      staff: {
        select: {
          role: true,
          restaurant: {
            select: { name: true, slug: true },
          },
        },
      },
    },
  });

  const platformAdmins = users.filter((u) => u.isPlatformAdmin);
  const restaurantOwners = users.filter(
    (u) => !u.isPlatformAdmin && u.restaurants.length > 0
  );
  const staffOnly = users.filter(
    (u) => !u.isPlatformAdmin && u.restaurants.length === 0 && u.staff.length > 0
  );
  const orphan = users.filter(
    (u) => !u.isPlatformAdmin && u.restaurants.length === 0 && u.staff.length === 0
  );

  type Row = {
    accountType: string;
    name: string;
    loginEmail: string;
    restaurant: string;
    slug: string;
    staffRole: string;
    dashboardUrl: string;
    customerMenuUrl: string;
    notes: string;
  };

  const rows: Row[] = [];

  for (const u of platformAdmins) {
    const owned = u.restaurants[0];
    const table = owned?.branches[0]?.tables[0];
    rows.push({
      accountType: "Super Admin (Platform Owner)",
      name: u.name || "—",
      loginEmail: u.email,
      restaurant: owned ? `${owned.name} (${owned.slug})` : "—",
      slug: owned?.slug || "—",
      staffRole: u.staff[0]?.role || "OWNER",
      dashboardUrl: dashboardUrl(true),
      customerMenuUrl: table
        ? menuUrl(table.id, owned!.slug, table.tableCode)
        : "—",
      notes: "**Platform owner account** — manages all restaurants via /dashboard/platform",
    });
  }

  for (const u of restaurantOwners) {
    for (const r of u.restaurants) {
      const table = r.branches[0]?.tables[0];
      const staffRole =
        u.staff.find((s) => s.restaurant.slug === r.slug)?.role || "OWNER";
      rows.push({
        accountType: staffRole === "OWNER" ? "Restaurant Admin (Owner)" : "Restaurant Staff",
        name: u.name || "—",
        loginEmail: u.email,
        restaurant: `${r.name}${r.nameAr ? ` / ${r.nameAr}` : ""}`,
        slug: r.slug,
        staffRole,
        dashboardUrl: dashboardUrl(false),
        customerMenuUrl: table
          ? menuUrl(table.id, r.slug, table.tableCode)
          : `${BASE}/r/${r.slug}`,
        notes: r.isActive ? "Active" : "Inactive",
      });
    }
  }

  for (const u of staffOnly) {
    for (const s of u.staff) {
      rows.push({
        accountType: "Restaurant Staff",
        name: u.name || "—",
        loginEmail: u.email,
        restaurant: s.restaurant.name,
        slug: s.restaurant.slug,
        staffRole: s.role,
        dashboardUrl: dashboardUrl(false),
        customerMenuUrl: `${BASE}/r/${s.restaurant.slug}`,
        notes: "Staff (not owner)",
      });
    }
  }

  for (const u of orphan) {
    rows.push({
      accountType: "User (no restaurant)",
      name: u.name || "—",
      loginEmail: u.email,
      restaurant: "—",
      slug: "—",
      staffRole: "—",
      dashboardUrl: dashboardUrl(false),
      customerMenuUrl: "—",
      notes: "No linked restaurant",
    });
  }

  console.log(`Production base URL: ${BASE}\n`);
  console.log(`Total users: ${users.length}`);
  console.log(`Platform admins: ${platformAdmins.length}`);
  console.log(`Restaurant owner accounts: ${restaurantOwners.length}`);
  console.log(`Staff-only accounts: ${staffOnly.length}`);
  console.log(`Orphan accounts: ${orphan.length}\n`);

  console.log(
    JSON.stringify(
      rows.map((r) => ({
        accountType: r.accountType,
        name: r.name,
        loginEmail: r.loginEmail,
        restaurant: r.restaurant,
        slug: r.slug,
        staffRole: r.staffRole,
        dashboardUrl: r.dashboardUrl,
        customerMenuUrl: r.customerMenuUrl,
        notes: r.notes,
      })),
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
