import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import {
  generateTotpSecret,
  totpOtpauthUrl,
  verifyTotp,
} from "@/lib/totp";
import { logPlatformAudit } from "@/lib/platform-audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { email: true, totpEnabled: true },
  });

  return NextResponse.json({
    enabled: user?.totpEnabled ?? false,
    email: user?.email,
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const { action, code, secret } = body as {
    action: "setup" | "enable" | "disable" | "verify";
    code?: string;
    secret?: string;
  };

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, email: true, totpSecret: true, totpEnabled: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "setup") {
    const newSecret = generateTotpSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: newSecret, totpEnabled: false },
    });

    await logPlatformAudit({
      userId: user.id,
      action: "PLATFORM_2FA_SETUP",
      entity: "User",
      entityId: user.id,
    });

    return NextResponse.json({
      secret: newSecret,
      otpauthUrl: totpOtpauthUrl(user.email, newSecret),
    });
  }

  if (action === "enable") {
    const pendingSecret = secret || user.totpSecret;
    if (!pendingSecret || !code) {
      return NextResponse.json({ error: "Code and secret required" }, { status: 400 });
    }
    if (!verifyTotp(pendingSecret, code)) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: pendingSecret, totpEnabled: true },
    });

    await logPlatformAudit({
      userId: user.id,
      action: "PLATFORM_2FA_ENABLED",
      entity: "User",
      entityId: user.id,
    });

    return NextResponse.json({ enabled: true });
  }

  if (action === "disable") {
    if (!user.totpEnabled || !user.totpSecret) {
      return NextResponse.json({ enabled: false });
    }
    if (!code || !verifyTotp(user.totpSecret, code)) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: false, totpSecret: null },
    });

    await logPlatformAudit({
      userId: user.id,
      action: "PLATFORM_2FA_DISABLED",
      entity: "User",
      entityId: user.id,
    });

    return NextResponse.json({ enabled: false });
  }

  if (action === "verify") {
    if (!user.totpSecret || !code) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    return NextResponse.json({ ok: verifyTotp(user.totpSecret, code) });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
