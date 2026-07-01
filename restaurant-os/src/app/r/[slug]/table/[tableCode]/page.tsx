import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function SlugTableMenuPage({
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
    select: { id: true },
  });

  if (!table) notFound();
  redirect(`/menu/${table.id}`);
}
