import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess, marketingError, requireMarketingOwnerAccess } from "@/lib/marketing/auth";
import {
  getStudioBrandContext,
  saveVideoBrandDefaults,
  type LogoPosition,
  type LogoTiming,
} from "@/lib/marketing/video-brand-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId, session } = await requireMarketingAccess();
  if (error) return error;
  const ctx = await getStudioBrandContext(restaurantId!, session!);
  return NextResponse.json(ctx);
}

export async function PUT(req: NextRequest) {
  const { error, restaurantId, canManageSecrets } = await requireMarketingOwnerAccess();
  if (error) return error;
  if (!canManageSecrets) {
    return marketingError("تحديث افتراضيات الهوية — مالك المطعم أو المشرف فقط", 403);
  }

  const body = await req.json();
  await saveVideoBrandDefaults(restaurantId!, {
    restaurantName: body.restaurantName,
    logoUrl: body.logoUrl,
    primaryColor: body.primaryColor,
    secondaryColor: body.secondaryColor,
    textColor: body.textColor,
    defaultLogoPosition: body.defaultLogoPosition as LogoPosition,
    defaultLogoTiming: body.defaultLogoTiming as LogoTiming,
    defaultCTA: body.defaultCTA,
  });
  return NextResponse.json({ ok: true });
}
