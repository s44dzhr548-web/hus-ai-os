import { NextRequest, NextResponse } from "next/server";
import { requireTableManagement } from "@/lib/table-management-permissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTableManagement();
  if (auth.error) return auth.error;

  const take = Math.min(parseInt(req.nextUrl.searchParams.get("take") || "50"), 200);

  const logs = await prisma.auditLog.findMany({
    where: {
      restaurantId: auth.restaurantId!,
      entity: "DiningTable",
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json(logs);
}
