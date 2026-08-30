import { NextRequest, NextResponse } from "next/server";
import { requireGbpConnectionManage, requireGoogleReviewsRead } from "@/lib/google-business/auth-guards";
import { fetchGbpLocations, GbpApiError } from "@/lib/google-business/api-client";
import { getGbpAccessToken } from "@/lib/google-business/connection-service";
import { apiAccessPendingMessage, logGoogleReviewAudit } from "@/lib/google-business/reviews-service";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireGoogleReviewsRead();
  if (error) return error;

  const conn = await prisma.googleBusinessConnection.findUnique({
    where: { restaurantId: restaurantId! },
    include: { locations: true },
  });
  if (!conn?.isActive) {
    return NextResponse.json({ ok: false, locations: [], saved: [] });
  }

  const accountName =
    req.nextUrl.searchParams.get("accountName") || conn.accountName || conn.accountId;
  if (!accountName) {
    return NextResponse.json({
      ok: true,
      locations: [],
      saved: conn.locations,
      needAccount: true,
    });
  }

  const token = await getGbpAccessToken(restaurantId!);
  if (!token) {
    return NextResponse.json({ ok: false, code: "TOKEN_EXPIRED" }, { status: 401 });
  }

  const normalized = accountName.startsWith("accounts/")
    ? accountName
    : `accounts/${accountName.replace(/^accounts\//, "")}`;

  try {
    const locations = await fetchGbpLocations(token, normalized);
    return NextResponse.json({
      ok: true,
      locations: locations.map((loc) => ({
        locationName: loc.name,
        locationId: loc.name?.replace(/^.*\/locations\//, "") ?? loc.name,
        displayName: loc.title ?? loc.name,
        address: loc.storefrontAddress?.addressLines?.join(", ") ?? null,
      })),
      saved: conn.locations,
      selectedLocationId: conn.locations.find((l) => l.isSelected)?.locationId ?? null,
    });
  } catch (e) {
    const code = e instanceof GbpApiError ? e.code : "API_ACCESS_NOT_APPROVED";
    return NextResponse.json({
      ok: false,
      code,
      message: e instanceof GbpApiError ? e.message : apiAccessPendingMessage(),
      locations: [],
      saved: conn.locations,
    });
  }
}

export async function POST(req: NextRequest) {
  const { restaurantId, session, error } = await requireGbpConnectionManage();
  if (error) return error;

  const body = await req.json();
  const locationName = String(body.locationName || "").trim();
  const locationId = String(body.locationId || body.locationName || "").trim();
  const displayName = String(body.displayName || "").trim() || null;
  if (!locationId) {
    return NextResponse.json({ error: "locationId مطلوب" }, { status: 400 });
  }

  const conn = await prisma.googleBusinessConnection.findUnique({
    where: { restaurantId: restaurantId! },
  });
  if (!conn?.isActive) {
    return NextResponse.json({ error: "غير مربوط" }, { status: 400 });
  }

  const locKey = locationId.includes("/") ? locationId.split("/").pop()! : locationId;

  await prisma.googleBusinessLocation.updateMany({
    where: { restaurantId: restaurantId!, connectionId: conn.id },
    data: { isSelected: false },
  });

  const row = await prisma.googleBusinessLocation.upsert({
    where: {
      restaurantId_locationId: { restaurantId: restaurantId!, locationId: locKey },
    },
    create: {
      restaurantId: restaurantId!,
      connectionId: conn.id,
      locationName: locationName || `locations/${locKey}`,
      locationId: locKey,
      displayName,
      isSelected: true,
    },
    update: {
      locationName: locationName || `locations/${locKey}`,
      displayName,
      isSelected: true,
    },
  });

  await logGoogleReviewAudit({
    restaurantId: restaurantId!,
    action: "GBP_LOCATION_SELECTED",
    userId: session?.user?.id,
    detailsJson: { locationId: locKey, displayName },
  });

  return NextResponse.json({ ok: true, location: row });
}
