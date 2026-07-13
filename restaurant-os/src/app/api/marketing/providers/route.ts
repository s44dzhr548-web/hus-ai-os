import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { canManageProviderSecrets } from "@/lib/marketing/providers/permissions";
import {
  listProvidersForCategory,
  getAdPlatformConnections,
  getRouting,
  getCostSummary,
  runWizardTest,
} from "@/lib/marketing/providers/connection-service";
import type { ProviderCategory } from "@/lib/marketing/providers/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;

  const section = req.nextUrl.searchParams.get("section");
  const category = req.nextUrl.searchParams.get("category") as ProviderCategory | null;

  if (section === "ads") {
    return NextResponse.json({
      platforms: await getAdPlatformConnections(restaurantId!),
      canManageSecrets: canManageProviderSecrets(session),
    });
  }
  if (section === "routing") {
    return NextResponse.json({ routing: await getRouting(restaurantId!), canManageSecrets: canManageProviderSecrets(session) });
  }
  if (section === "costs") {
    return NextResponse.json({ ...(await getCostSummary(restaurantId!)), canManageSecrets: canManageProviderSecrets(session) });
  }
  if (section === "wizard") {
    return NextResponse.json(await runWizardTest(restaurantId!));
  }
  if (category) {
    return NextResponse.json({
      providers: await listProvidersForCategory(restaurantId!, category),
      canManageSecrets: canManageProviderSecrets(session),
    });
  }

  return NextResponse.json({ error: "category or section required" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { requireMarketingOwnerAccess, marketingError } = await import("@/lib/marketing/auth");
  const { saveRouting, saveCostSettings } = await import("@/lib/marketing/providers/connection-service");
  const { error, restaurantId, session, canManageSecrets } = await requireMarketingOwnerAccess();
  if (error) return error;
  if (!canManageSecrets) return marketingError("صلاحية المالك مطلوبة", 403);

  if (body.section === "routing") {
    await saveRouting(restaurantId!, session!.user.id, body.rules);
    return NextResponse.json({ ok: true });
  }
  if (body.section === "costs") {
    await saveCostSettings(restaurantId!, session!.user.id, body.settings);
    return NextResponse.json({ ok: true });
  }
  return marketingError("Unknown section", 400);
}
