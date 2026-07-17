import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveCustomerTableSession } from "@/lib/customer-table-session";
import { CustomerSessionGate } from "@/components/customer/customer-session-gate";

export default async function CustomerGiftsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { slug } = await params;
  const { table: tableId } = await searchParams;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      nameAr: true,
      name: true,
      primaryColor: true,
      tableGiftsEnabled: true,
      isActive: true,
    },
  });

  if (!restaurant?.isActive) {
    redirect("/");
  }

  if (!restaurant.tableGiftsEnabled) {
    redirect(`/r/${slug}`);
  }

  const ctx = await resolveCustomerTableSession(tableId ?? null);
  if (!ctx.valid || !ctx.tableId) {
    return (
      <CustomerSessionGate
        slug={slug}
        title="الإهداء"
        primaryColor={restaurant.primaryColor ?? undefined}
      />
    );
  }

  redirect(`/gift/${ctx.tableId}`);
}
