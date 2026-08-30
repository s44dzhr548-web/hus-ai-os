import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertFeature } from "@/lib/permissions-engine";
import { parseGoogleMapsEmbedInput } from "@/lib/google-maps-embed";
import { Prisma } from "@prisma/client";

function logSettingsUpdateFailure(info: {
  code: string;
  message: string;
  restaurantId?: string;
}) {
  console.error(
    JSON.stringify({
      event: "restaurant_settings_update_failed",
      code: info.code,
      message: info.message,
      restaurantId: info.restaurantId,
      ts: new Date().toISOString(),
    })
  );
}

export async function loadRestaurantForSettings(restaurantId: string) {
  return prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      branches: { where: { isActive: true } },
      subscription: true,
      _count: { select: { staff: true, menuCategories: true } },
    },
  });
}

export async function updateRestaurantFromBody(
  restaurantId: string,
  body: Record<string, unknown>
) {
  const data: Prisma.RestaurantUpdateInput = {};

  if (body.name !== undefined) data.name = String(body.name);
  if (body.nameAr !== undefined) data.nameAr = String(body.nameAr);
  if (body.description !== undefined) data.description = body.description as string | null;
  if (body.phone !== undefined) data.phone = body.phone as string | null;
  if (body.email !== undefined) data.email = body.email as string | null;
  if (body.taxNumber !== undefined) data.taxNumber = body.taxNumber as string | null;
  if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl as string | null;
  if (body.address !== undefined) data.address = body.address as string | null;
  if (body.addressAr !== undefined) data.addressAr = body.addressAr as string | null;
  if (body.workingHours !== undefined) data.workingHours = body.workingHours as Prisma.InputJsonValue;
  if (body.timezone !== undefined) data.timezone = String(body.timezone);
  if (body.currency !== undefined) data.currency = String(body.currency);
  if (body.customDomain !== undefined) {
    const cd = body.customDomain;
    const nextDomain = cd === null || cd === "" ? null : String(cd);
    if (nextDomain) {
      const domainCheck = await assertFeature(restaurantId, "customDomain");
      if (domainCheck) return domainCheck;
    }
    data.customDomain = nextDomain;
  }

  let mapsUpdated = false;
  if (body.googleMapsEmbedInput !== undefined || body.googleMapsEmbedSrc !== undefined) {
    const raw =
      body.googleMapsEmbedInput !== undefined
        ? String(body.googleMapsEmbedInput ?? "")
        : String(body.googleMapsEmbedSrc ?? "");
    const parsed = parseGoogleMapsEmbedInput(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: "GOOGLE_MAPS_INVALID" }, { status: 400 });
    }
    data.googleMapsEmbedSrc = parsed.src;
    mapsUpdated = true;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث", code: "EMPTY_UPDATE" }, { status: 400 });
  }

  try {
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data,
    });

    return NextResponse.json({
      ...restaurant,
      googleMapsEmbedUrl: restaurant.googleMapsEmbedSrc,
      mapsSaved: mapsUpdated,
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const code = err.code ?? "UPDATE_FAILED";
    const message = err.message ?? "فشل تحديث المطعم";
    logSettingsUpdateFailure({ code, message, restaurantId });

    if (code === "P2022") {
      return NextResponse.json(
        {
          error: "عمود خريطة Google غير موجود في قاعدة البيانات — شغّل migration",
          code: "SCHEMA_OUT_OF_DATE",
        },
        { status: 503 }
      );
    }
    if (code === "P2002") {
      return NextResponse.json(
        { error: "النطاق المخصص مستخدم مسبقًا", code: "CUSTOM_DOMAIN_TAKEN" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "فشل حفظ الإعدادات", code: "RESTAURANT_UPDATE_FAILED" },
      { status: 500 }
    );
  }
}
