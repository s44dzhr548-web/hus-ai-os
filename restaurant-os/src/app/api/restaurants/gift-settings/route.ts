import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import {
  DEFAULT_TABLE_GIFT_SETTINGS,
  parseTableGiftSettings,
} from "@/lib/table-gifts/types";

export const dynamic = "force-dynamic";

const ROLES = ["OWNER", "ADMIN"];

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole(ROLES);
  if (error) return error;

  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId! },
    select: {
      tableGiftsEnabled: true,
      tableGiftsSettingsJson: true,
      customerWishesEnabled: true,
      customerSongRequestsEnabled: true,
    },
  });

  const giftSettings = r
    ? parseTableGiftSettings(r.tableGiftsEnabled, r.tableGiftsSettingsJson)
    : DEFAULT_TABLE_GIFT_SETTINGS;

  return NextResponse.json({
    settings: {
      ...giftSettings,
      wishesEnabled: r?.customerWishesEnabled ?? false,
      songRequestsEnabled: r?.customerSongRequestsEnabled ?? false,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(ROLES);
  if (error) return error;

  const body = await req.json();
  const enabled = Boolean(body.enabled);
  const settingsJson = {
    acceptanceTimeoutMinutes:
      body.acceptanceTimeoutMinutes ??
      DEFAULT_TABLE_GIFT_SETTINGS.acceptanceTimeoutMinutes,
    allowAnonymous: body.allowAnonymous !== false,
    showSenderName: body.showSenderName !== false,
  };

  await prisma.restaurant.update({
    where: { id: restaurantId! },
    data: {
      tableGiftsEnabled: enabled,
      tableGiftsSettingsJson: settingsJson,
      ...(typeof body.wishesEnabled === "boolean"
        ? { customerWishesEnabled: body.wishesEnabled }
        : {}),
      ...(typeof body.songRequestsEnabled === "boolean"
        ? { customerSongRequestsEnabled: body.songRequestsEnabled }
        : {}),
    },
  });

  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId! },
    select: {
      tableGiftsEnabled: true,
      tableGiftsSettingsJson: true,
      customerWishesEnabled: true,
      customerSongRequestsEnabled: true,
    },
  });

  const giftSettings = r
    ? parseTableGiftSettings(r.tableGiftsEnabled, r.tableGiftsSettingsJson)
    : DEFAULT_TABLE_GIFT_SETTINGS;

  return NextResponse.json({
    settings: {
      ...giftSettings,
      wishesEnabled: r?.customerWishesEnabled ?? false,
      songRequestsEnabled: r?.customerSongRequestsEnabled ?? false,
    },
  });
}
