import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { AD_PLATFORMS } from "@/lib/marketing/constants";
import { isOAuthConfigured } from "@/lib/marketing/oauth";

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

  const platforms = AD_PLATFORMS.map((p) => ({
    ...p,
    connected: connections.find((c) => c.platform === p.id),
    oauthConfigured: isOAuthConfigured(p.id as import("@prisma/client").MarketingPlatform),
  }));

  return NextResponse.json({ connections, platforms });
}
