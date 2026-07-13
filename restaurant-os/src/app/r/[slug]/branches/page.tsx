import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { BRANDING_SELECT, resolveCustomerBranding } from "@/lib/restaurant-branding";
import { LandingSubPage } from "@/components/customer/landing-sub-page";

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      ...BRANDING_SELECT,
      branches: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          nameAr: true,
          nameEn: true,
          address: true,
          addressAr: true,
          city: true,
          phone: true,
          workingHours: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!restaurant) notFound();

  const branding = resolveCustomerBranding(restaurant);

  return (
    <LandingSubPage
      slug={slug}
      title="الفروع"
      restaurantName={restaurant.nameAr || restaurant.name}
      logoUrl={restaurant.logoUrl}
      primaryColor={branding.primaryColor}
    >
      <div className="space-y-4">
        {restaurant.branches.length === 0 ? (
          <p className="text-center opacity-70">لا توجد فروع مسجلة</p>
        ) : (
          restaurant.branches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <h2 className="text-lg font-semibold">
                {branch.nameAr || branch.name}
              </h2>
              {(branch.addressAr || branch.address || branch.city) && (
                <p className="mt-2 text-sm opacity-80">
                  📍 {[branch.addressAr || branch.address, branch.city]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {branch.phone && (
                <a
                  href={`tel:${branch.phone}`}
                  className="mt-2 inline-block text-sm"
                  style={{ color: branding.primaryColor }}
                >
                  📞 {branch.phone}
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </LandingSubPage>
  );
}
