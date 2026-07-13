import { NextRequest, NextResponse } from "next/server";
import { requireTableManagement } from "@/lib/table-management-permissions";
import prisma from "@/lib/prisma";
import { exportTablesCsv } from "@/lib/table-management-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTableManagement();
  if (auth.error) return auth.error;

  const branchId = req.nextUrl.searchParams.get("branchId");
  const idsParam = req.nextUrl.searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;

  const tables = await prisma.diningTable.findMany({
    where: {
      branch: { restaurantId: auth.restaurantId! },
      isArchived: false,
      ...(branchId ? { branchId } : {}),
      ...(ids ? { id: { in: ids } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
  });

  const csv = exportTablesCsv(tables);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tables-export-${Date.now()}.csv"`,
    },
  });
}
