import { NextResponse } from "next/server";
import {
  assertLiveBillingReady,
  getBillingGatewayStatus,
} from "@/lib/billing/gateway";
import { requirePlatformAdmin, requireRestaurantRole } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");

  if (scope === "platform") {
    const { error } = await requirePlatformAdmin();
    if (error) return error;
  } else {
    const { error } = await requireRestaurantRole(["OWNER", "ADMIN"]);
    if (error) return error;
  }

  const status = getBillingGatewayStatus();
  const liveCheck = assertLiveBillingReady();

  return NextResponse.json({
    ...status,
    liveReady: liveCheck.ok,
    liveError: liveCheck.ok ? null : liveCheck.error,
    missingRequired: liveCheck.ok ? [] : liveCheck.missingKeys,
  });
}
