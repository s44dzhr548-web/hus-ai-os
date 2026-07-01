import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function RestaurantSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      branches: {
        where: { isActive: true },
        include: {
          tables: { where: { isActive: true }, orderBy: { number: "asc" }, take: 1 },
        },
      },
    },
  });

  if (!restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-gray-600">المطعم غير موجود</p>
      </div>
    );
  }

  const table =
    restaurant.branches.find((b) => b.tables[0])?.tables[0] ?? null;

  if (table?.tableCode) {
    redirect(`/r/${slug}/table/${table.tableCode}`);
  }
  if (table) {
    redirect(`/menu/${table.id}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">{restaurant.nameAr || restaurant.name}</h1>
        <p className="mt-2 text-gray-600">لا توجد طاولات نشطة بعد.</p>
      </div>
    </div>
  );
}
