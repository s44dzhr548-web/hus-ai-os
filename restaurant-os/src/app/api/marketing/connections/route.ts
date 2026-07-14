import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { AD_PLATFORMS } from "@/lib/marketing/constants";
import { isOAuthConfigured } from "@/lib/marketing/oauth";
import type { MarketingPlatform } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error, restaurantId } = await requireMarketingAccess();
  if (error) return error;

  const connections = await prisma.marketingAdConnection.findMany({
    where: { restaurantId: restaurantId! },
    select: {
      id: true,
      platform: true,
      accountId: true,
      accountName: true,
      isActive: true,
      connectedAt: true,
      scopes: true,
    },
  });

  const platforms = await Promise.all(
    AD_PLATFORMS.map(async (p) => ({
      ...p,
      connected: connections.find((c) => c.platform === p.id),
      integrationReady: await isOAuthConfigured(p.id as MarketingPlatform),
    }))
  );

  return NextResponse.json({ connections, platforms });
}
