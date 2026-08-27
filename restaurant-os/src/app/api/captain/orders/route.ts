import { NextRequest, NextResponse } from "next/server";
import { requireCaptainAccess } from "@/lib/captain/auth";
import { getCaptainStats, listCaptainOrders } from "@/lib/captain/orders";
import type { OrderStatus } from "@prisma/client";
import { captainFilterStatuses } from "@/lib/captain/status";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error, restaurantId } = await requireCaptainAccess();
  if (error) return error;

  const filter = req.nextUrl.searchParams.get("filter") || "all";
  const search = req.nextUrl.searchParams.get("search") || undefined;
  const tableId = req.nextUrl.searchParams.get("tableId") || undefined;
  const since = req.nextUrl.searchParams.get("since");

  const filterDef = captainFilterStatuses().find((f) => f.key === filter);
  const statuses = filterDef?.statuses as OrderStatus[] | undefined;

  const [stats, orders] = await Promise.all([
    getCaptainStats(restaurantId!),
    listCaptainOrders(restaurantId!, { status: statuses, search, tableId }),
  ]);

  const filtered =
    since && !Number.isNaN(Date.parse(since))
      ? orders.filter((o) => new Date(o.updatedAt ?? o.createdAt) >= new Date(since))
      : orders;

  return NextResponse.json({
    stats,
    orders: filtered.length ? filtered : orders,
    serverTime: new Date().toISOString(),
  });
}
