import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { verifyOwnerCredentials } from "@/lib/owner-setup";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "البريد وكلمة المرور مطلوبان" }, { status: 400 });
  }

  const result = await verifyOwnerCredentials(email, password);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || "login_failed" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    userId: result.userId,
    restaurantId: result.restaurantId,
    restaurantName: result.restaurantName,
    role: result.role,
    dashboardUrl: "/dashboard",
  });
}
