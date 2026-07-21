import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin, requireRestaurantRole } from "@/lib/api-auth";
import {
  getRestaurantAiAccessDashboard,
  updateRestaurantAiAccess,
} from "@/lib/restaurant-ai-access/service";
import {
  RESTAURANT_AI_ROLE_IDS,
  type RestaurantAiRoleId,
} from "@/lib/restaurant-ai-access/constants";

export const dynamic = "force-dynamic";

/** GET — restaurant staff read usage; scoped to active restaurant only. */
export async function GET(req: NextRequest) {
  const platformOnly = req.nextUrl.searchParams.get("restaurantId");
  if (platformOnly) {
    const { error } = await requirePlatformAdmin();
    if (error) return error;
    const dashboard = await getRestaurantAiAccessDashboard(platformOnly);
    return NextResponse.json(dashboard);
  }

  const { restaurantId, error } = await requireRestaurantRole([
    "OWNER",
    "ADMIN",
    "MANAGER",
    "MARKETING",
    "RECEPTION",
  ]);
  if (error) return error;

  const dashboard = await getRestaurantAiAccessDashboard(restaurantId!);
  return NextResponse.json(dashboard);
}

/** PUT — Platform Owner only: permissions & limits. */
export async function PUT(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const restaurantId = String(body.restaurantId || "").trim();
  if (!restaurantId) {
    return NextResponse.json({ error: "معرف المطعم مطلوب" }, { status: 400 });
  }

  const rawRoles = Array.isArray(body.enabledRoles) ? body.enabledRoles : undefined;
  const enabledRoles = rawRoles
    ? rawRoles
        .map(String)
        .filter((r: string): r is RestaurantAiRoleId =>
          RESTAURANT_AI_ROLE_IDS.includes(r as RestaurantAiRoleId)
        )
    : undefined;

  if (rawRoles && enabledRoles && enabledRoles.length === 0 && rawRoles.length > 0) {
    return NextResponse.json({ error: "أدوار غير صالحة" }, { status: 400 });
  }

  await updateRestaurantAiAccess({
    restaurantId,
    enabledRoles,
    dailyRequestLimit:
      body.dailyRequestLimit !== undefined ? Number(body.dailyRequestLimit) : undefined,
    monthlyRequestLimit:
      body.monthlyRequestLimit !== undefined ? Number(body.monthlyRequestLimit) : undefined,
    monthlyCostLimitSar:
      body.monthlyCostLimitSar !== undefined ? Number(body.monthlyCostLimitSar) : undefined,
    servicePaused:
      body.servicePaused !== undefined ? Boolean(body.servicePaused) : undefined,
    userId: session!.user.id,
  });

  const dashboard = await getRestaurantAiAccessDashboard(restaurantId);
  return NextResponse.json({ ok: true, ...dashboard });
}

/** POST — pause/resume service (Platform Owner). */
export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const restaurantId = String(body.restaurantId || "").trim();
  const servicePaused = Boolean(body.servicePaused);
  if (!restaurantId) {
    return NextResponse.json({ error: "معرف المطعم مطلوب" }, { status: 400 });
  }

  await updateRestaurantAiAccess({
    restaurantId,
    servicePaused,
    userId: session!.user.id,
  });

  return NextResponse.json({
    ok: true,
    servicePaused,
    message: servicePaused ? "تم إيقاف خدمة AI عن المطعم" : "تم تفعيل خدمة AI للمطعم",
  });
}
