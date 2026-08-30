import { NextRequest, NextResponse } from "next/server";
import { requireGbpConnectionManage, requireGoogleReviewsRead } from "@/lib/google-business/auth-guards";
import { fetchGbpAccounts, GbpApiError } from "@/lib/google-business/api-client";
import { getGbpAccessToken } from "@/lib/google-business/connection-service";
import { apiAccessPendingMessage, logGoogleReviewAudit } from "@/lib/google-business/reviews-service";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const { restaurantId, error } = await requireGoogleReviewsRead();
  if (error) return error;

  const conn = await prisma.googleBusinessConnection.findUnique({
    where: { restaurantId: restaurantId! },
  });
  if (!conn?.isActive) {
    return NextResponse.json({ ok: false, code: "GOOGLE_ACCOUNT_NOT_CONNECTED", accounts: [] });
  }

  const token = await getGbpAccessToken(restaurantId!);
  if (!token) {
    return NextResponse.json({ ok: false, code: "TOKEN_EXPIRED", accounts: [] }, { status: 401 });
  }

  try {
    const accounts = await fetchGbpAccounts(token);
    return NextResponse.json({
      ok: true,
      accounts: accounts.map((a) => ({
        accountName: a.name,
        accountId: a.name?.replace(/^accounts\//, "") ?? null,
        displayName: a.accountName ?? a.name,
        type: a.type ?? null,
      })),
      selectedAccountName: conn.accountName,
      selectedAccountId: conn.accountId,
    });
  } catch (e) {
    const code = e instanceof GbpApiError ? e.code : "API_ACCESS_NOT_APPROVED";
    return NextResponse.json({
      ok: false,
      code,
      message: e instanceof GbpApiError ? e.message : apiAccessPendingMessage(),
      accounts: [],
    });
  }
}

export async function POST(req: NextRequest) {
  const { restaurantId, session, error } = await requireGbpConnectionManage();
  if (error) return error;

  const body = await req.json();
  const accountName = String(body.accountName || "").trim();
  if (!accountName) {
    return NextResponse.json({ error: "accountName مطلوب" }, { status: 400 });
  }
  const accountId = accountName.replace(/^accounts\//, "");

  await prisma.googleBusinessConnection.update({
    where: { restaurantId: restaurantId! },
    data: {
      accountName,
      accountId,
    },
  });

  await logGoogleReviewAudit({
    restaurantId: restaurantId!,
    action: "GBP_ACCOUNT_SELECTED",
    userId: session?.user?.id,
    detailsJson: { accountName },
  });

  return NextResponse.json({ ok: true, accountName, accountId });
}
