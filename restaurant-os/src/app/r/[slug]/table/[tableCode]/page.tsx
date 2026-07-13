import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { CustomerHomepage } from "@/components/customer/customer-homepage";
import { BRANDING_SELECT, resolveCustomerBranding } from "@/lib/restaurant-branding";
import { getLandingContext } from "@/lib/landing-context";

export default async function SlugTableHomePage({
  params,
}: {
  params: Promise<{ slug: string; tableCode: string }>;
}) {
  const { slug, tableCode } = await params;

  const table = await prisma.diningTable.findFirst({
    where: {
      tableCode,
      isActive: true,
      branch: { restaurant: { slug }, isActive: true },
    },
    include: {
      branch: {
        include: {
          restaurant: {
            select: { ...BRANDING_SELECT, whatsappNumber: true, phone: true },
          },
        },
      },
    },
  });

  if (!table) notFound();

  const restaurant = table.branch.restaurant;
  const branding = resolveCustomerBranding(restaurant, "ar");
  const context = await getLandingContext(
    restaurant.id,
    table.branch,
    restaurant.workingHours
  );

  return (
    <CustomerHomepage
      branding={branding}
      restaurantName={restaurant.nameAr || restaurant.name}
      restaurantNameEn={restaurant.nameEn || restaurant.name}
      slug={slug}
      tableId={table.id}
      tableNumber={table.number}
      whatsappNumber={restaurant.whatsappNumber}
      context={{ ...context, phone: restaurant.phone }}
    />
  );
}
