import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdsPlatformConnectAccess } from "@/lib/marketing/auth";
import { logMarketingAudit } from "@/lib/marketing/security";
import type { MarketingPlatform } from "@prisma/client";

export const dynamic = "force-dynamic";

type PendingAccount = {
  accountId: string;
  accountName: string;
  businessId?: string | null;
  businessName: string | null;
  currency: string | null;
  timezone: string | null;
};

export async function GET() {
  const { error, restaurantId } = await requireAdsPlatformConnectAccess();
  if (error) return error;

  const conn = await prisma.marketingAdConnection.findUnique({
    where: {
      restaurantId_platform: { restaurantId: restaurantId!, platform: "META" },
    },
    select: { syncStatus: true, metadataJson: true },
  });

  if (conn?.syncStatus !== "PENDING_ACCOUNT") {
    return NextResponse.json({ accounts: [] });
  }

  const meta = conn.metadataJson as { pendingAccounts?: PendingAccount[] } | null;
  return NextResponse.json({ accounts: meta?.pendingAccounts ?? [] });
}

export async function POST(req: NextRequest) {
  const { error, restaurantId, session } = await requireAdsPlatformConnectAccess();
  if (error) return error;

  const body = await req.json();
  const accountId = String(body.accountId || "");
  if (!accountId) {
    return NextResponse.json({ error: "اختر حساب إعلانات" }, { status: 400 });
  }

  const conn = await prisma.marketingAdConnection.findUnique({
    where: {
      restaurantId_platform: { restaurantId: restaurantId!, platform: "META" as MarketingPlatform },
    },
  });

  if (!conn || conn.syncStatus !== "PENDING_ACCOUNT") {
    return NextResponse.json({ error: "لا يوجد ربط بانتظار اختيار الحساب" }, { status: 404 });
  }

  const meta = conn.metadataJson as { pendingAccounts?: PendingAccount[] } | null;
  const picked = meta?.pendingAccounts?.find((a) => a.accountId === accountId);
  if (!picked) {
    return NextResponse.json({ error: "الحساب غير موجود في القائمة" }, { status: 400 });
  }

  await prisma.marketingAdConnection.update({
    where: { id: conn.id },
    data: {
      accountId: picked.accountId,
      accountName: picked.accountName,
      businessName: picked.businessName,
      currency: picked.currency,
      timezone: picked.timezone,
      isActive: true,
      syncStatus: "CONNECTED",
      connectedAt: new Date(),
      lastSyncAt: new Date(),
      metadataJson: {
        businessId: picked.businessId ?? null,
        adAccountId: picked.accountId,
        businessName: picked.businessName,
        accountName: picked.accountName,
        currency: picked.currency,
        timezone: picked.timezone,
      },
    },
  });

  await logMarketingAudit({
    restaurantId: restaurantId!,
    userId: session?.user?.id,
    action: "OAUTH_SELECT_ACCOUNT",
    entityType: "MarketingAdConnection",
    details: { platform: "META", accountId: picked.accountId, accountName: picked.accountName },
  });

  return NextResponse.json({ ok: true, account: picked });
}
