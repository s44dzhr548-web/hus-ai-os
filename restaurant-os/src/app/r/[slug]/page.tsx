import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { CustomerHomepage } from "@/components/customer/customer-homepage";
import { BRANDING_SELECT, resolveCustomerBranding } from "@/lib/restaurant-branding";
import { getLandingContext } from "@/lib/landing-context";
import { getActiveSessionForTable } from "@/lib/reception";

export default async function RestaurantSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      ...BRANDING_SELECT,
      whatsappNumber: true,
      phone: true,
      branches: {
        where: { isActive: true },
        include: {
          tables: { where: { isActive: true }, orderBy: { number: "asc" }, take: 1 },
        },
      },
    },
  });

  if (!restaurant) notFound();

  const branchWithTable = restaurant.branches.find((b) => b.tables[0]);
  const table = branchWithTable?.tables[0] ?? null;
  const branch = branchWithTable ?? restaurant.branches[0] ?? null;

  const branding = resolveCustomerBranding(restaurant, "ar");
  const context = await getLandingContext(
    restaurant.id,
    branch,
    restaurant.workingHours
  );

  const activeSession = table ? await getActiveSessionForTable(table.id) : null;

  return (
    <CustomerHomepage
      branding={branding}
      restaurantName={restaurant.nameAr || restaurant.name}
      restaurantNameEn={restaurant.nameEn || restaurant.name}
      slug={slug}
      tableId={table?.id}
      tableNumber={table?.number}
      hasActiveSession={!!activeSession}
      whatsappNumber={restaurant.whatsappNumber}
      context={{ ...context, phone: restaurant.phone }}
    />
  );
}
