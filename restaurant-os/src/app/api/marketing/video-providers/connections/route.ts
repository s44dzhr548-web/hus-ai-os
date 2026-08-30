import { NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { canViewConnectionStatus } from "@/lib/marketing/providers/permissions";
import { listVideoProviderConnections } from "@/lib/marketing/providers/connection-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;
  if (!canViewConnectionStatus(session)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const connections = await listVideoProviderConnections(restaurantId!);
  return NextResponse.json({ connections, restaurantId: restaurantId! });
}
