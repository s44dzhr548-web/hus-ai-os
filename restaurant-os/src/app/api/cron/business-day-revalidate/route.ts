import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { currentBusinessDate, getZonedParts } from "@/lib/business-day";

export const dynamic = "force-dynamic";

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

const REVALIDATE_PATHS = [
  "/dashboard",
  "/dashboard/customers",
  "/dashboard/reception",
  "/dashboard/reservations",
  "/dashboard/monitoring",
  "/dashboard/staff-activity",
];

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    select: { id: true, timezone: true, businessDayStartHour: true, slug: true },
  });

  const rolled: string[] = [];

  for (const r of restaurants) {
    const tz = r.timezone || "Asia/Riyadh";
    const hour = r.businessDayStartHour ?? 4;
    const parts = getZonedParts(now, tz);
    if (parts.hour === hour && parts.minute < 5) {
      rolled.push(r.id);
      for (const path of REVALIDATE_PATHS) {
        revalidatePath(path);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    businessDates: restaurants.map((r) => ({
      id: r.id,
      slug: r.slug,
      businessDate: currentBusinessDate(
        now,
        r.timezone || "Asia/Riyadh",
        r.businessDayStartHour ?? 4
      ),
    })),
    revalidatedFor: rolled,
  });
}
