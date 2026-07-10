import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import {
  applyPhonePrivacy,
  computeFavoriteTable,
  computeFavoriteArea,
} from "@/lib/customer-history";
import { tableIconEmoji } from "@/lib/table-meta";
import {
  serializeCustomerVisit,
  serializeReservation,
} from "@/lib/reception";

export const dynamic = "force-dynamic";

const CUSTOMER_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION", "CASHIER", "WAITER"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { restaurantId, session, error } = await requireRestaurantRole(CUSTOMER_ROLES);
  if (error) return error;

  const featureErr = await assertFeature(restaurantId!, "reception");
  if (featureErr) return featureErr;

  const role = session?.user.role;

  const profile = await prisma.customerProfile.findFirst({
    where: { id, restaurantId: restaurantId! },
    include: {
      visits: { orderBy: { arrivalTime: "desc" }, take: 100 },
      reservations: { orderBy: [{ date: "desc" }, { time: "desc" }], take: 100 },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
  }

  const completedVisits = profile.visits.filter((v) => v.visitStatus === "COMPLETED");

  return NextResponse.json({
    id: profile.id,
    customerName: profile.customerName,
    customerPhone: applyPhonePrivacy(
      { customerPhone: profile.customerPhone },
      role
    ).customerPhone,
    visitCount: profile.visitCount,
    totalSpending: Number(profile.totalSpending),
    lastVisitAt: profile.lastVisitAt?.toISOString() ?? null,
    isVip: profile.isVip,
    notes: profile.notes,
    favoriteTable: computeFavoriteTable(completedVisits),
    favoriteArea: computeFavoriteArea(completedVisits),
    reservations: profile.reservations.map((r) =>
      applyPhonePrivacy(serializeReservation(r), role)
    ),
    visits: profile.visits.map((v) => ({
      ...applyPhonePrivacy(serializeCustomerVisit(v), role),
      tableIconEmoji: tableIconEmoji(v.tableIcon),
    })),
  });
}
