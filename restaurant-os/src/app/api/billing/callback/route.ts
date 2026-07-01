import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  logBillingEvent,
  processMoyasarPaymentId,
} from "@/lib/billing/subscription-billing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const billingId = req.nextUrl.searchParams.get("billingId");
  const paymentId =
    req.nextUrl.searchParams.get("id") || req.nextUrl.searchParams.get("paymentId");

  if (!billingId || !paymentId) {
    return NextResponse.redirect(
      new URL("/dashboard/billing?error=missing_params", req.nextUrl.origin)
    );
  }

  const result = await processMoyasarPaymentId(
    paymentId,
    billingId,
    session?.user?.id
  );

  if (!result.ok) {
    await logBillingEvent({
      restaurantId: "unknown",
      userId: session?.user?.id,
      action: "BILLING_CALLBACK_FAILED",
      entityId: billingId,
      metadata: { error: result.error, paymentId },
    });
    return NextResponse.redirect(
      new URL(
        `/dashboard/billing?error=${encodeURIComponent(result.error || "failed")}`,
        req.nextUrl.origin
      )
    );
  }

  return NextResponse.redirect(
    new URL(
      `/dashboard/billing/success?invoice=${result.billing?.invoiceNumber || billingId}`,
      req.nextUrl.origin
    )
  );
}
