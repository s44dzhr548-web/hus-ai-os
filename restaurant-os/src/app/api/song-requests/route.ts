import { NextRequest, NextResponse } from "next/server";
import { requireRestaurantRole } from "@/lib/api-auth";
import {
  listRestaurantSongRequests,
  updateSongRequestStatusAdmin,
} from "@/lib/song-requests/service";
import type { SongRequestStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTION"];

export async function GET() {
  const { restaurantId, error } = await requireRestaurantRole(ROLES);
  if (error) return error;
  return NextResponse.json({
    requests: await listRestaurantSongRequests(restaurantId!),
  });
}

export async function PATCH(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurantRole(ROLES);
  if (error) return error;
  try {
    const body = await req.json();
    const request = await updateSongRequestStatusAdmin(
      body.requestId,
      restaurantId!,
      body.status as SongRequestStatus
    );
    return NextResponse.json({ request });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
