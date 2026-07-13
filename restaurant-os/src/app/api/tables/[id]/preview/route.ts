import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import { getTablePreviewDetail } from "@/lib/table-management-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const { id } = await params;
  const detail = await getTablePreviewDetail(id, restaurantId!);
  if (!detail) {
    return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
