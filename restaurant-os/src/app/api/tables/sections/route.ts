import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import { requireTableManagement } from "@/lib/table-management-permissions";
import prisma from "@/lib/prisma";
import { parseBranchSections, defaultSections } from "@/lib/table-sections";
import { logTableAudit } from "@/lib/table-audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const branchId = req.nextUrl.searchParams.get("branchId");
  if (!branchId) {
    return NextResponse.json({ error: "branchId مطلوب" }, { status: 400 });
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, restaurantId: restaurantId! },
    select: { tableSectionsJson: true, floorPlanJson: true },
  });
  if (!branch) {
    return NextResponse.json({ error: "الفرع غير موجود" }, { status: 404 });
  }

  return NextResponse.json({
    sections: parseBranchSections(branch.tableSectionsJson ?? defaultSections()),
    floorPlan: branch.floorPlanJson,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireTableManagement();
  if (auth.error) return auth.error;

  const body = await req.json();
  const { branchId, sections, floorPlan } = body;
  if (!branchId) {
    return NextResponse.json({ error: "branchId مطلوب" }, { status: 400 });
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, restaurantId: auth.restaurantId! },
  });
  if (!branch) {
    return NextResponse.json({ error: "الفرع غير موجود" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (sections) data.tableSectionsJson = sections;
  if (floorPlan) data.floorPlanJson = { ...floorPlan, updatedAt: new Date().toISOString() };

  const updated = await prisma.branch.update({
    where: { id: branchId },
    data,
    select: { tableSectionsJson: true, floorPlanJson: true },
  });

  await logTableAudit({
    restaurantId: auth.restaurantId!,
    userId: auth.session!.user.id,
    action: "TABLE_UPDATE",
    metadata: { branchId, sectionsUpdated: !!sections, floorPlanUpdated: !!floorPlan },
  });

  return NextResponse.json({
    sections: parseBranchSections(updated.tableSectionsJson ?? defaultSections()),
    floorPlan: updated.floorPlanJson,
  });
}
