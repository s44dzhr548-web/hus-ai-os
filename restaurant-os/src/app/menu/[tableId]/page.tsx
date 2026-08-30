import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import MenuClient from "./menu-client";

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ direct?: string; view?: string }>;
}) {
  const { tableId } = await params;
  const sp = await searchParams;

  const table = await prisma.diningTable.findUnique({
    where: { id: tableId, isActive: true },
    select: {
      publicQrToken: true,
      tableCode: true,
      branch: { select: { restaurant: { select: { slug: true } } } },
    },
  });

  if (!table) {
    return <MenuClient />;
  }

  if (table.publicQrToken && sp?.direct !== "1") {
    redirect(`/q/${table.publicQrToken}`);
  }

  if (sp?.direct !== "1" && table.tableCode && table.branch.restaurant.slug) {
    redirect(`/r/${table.branch.restaurant.slug}/table/${table.tableCode}`);
  }

  return <MenuClient />;
}
