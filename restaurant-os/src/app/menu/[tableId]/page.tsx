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

  if (sp?.direct !== "1") {
    const table = await prisma.diningTable.findUnique({
      where: { id: tableId, isActive: true },
      select: {
        tableCode: true,
        branch: { select: { restaurant: { select: { slug: true } } } },
      },
    });

    if (table?.tableCode && table.branch.restaurant.slug) {
      redirect(`/r/${table.branch.restaurant.slug}/table/${table.tableCode}`);
    }
  }

  return <MenuClient />;
}
