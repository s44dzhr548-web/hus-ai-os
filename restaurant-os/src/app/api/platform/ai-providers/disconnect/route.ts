import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import {
  disconnectPlatformAiProvider,
  type PlatformBrainProviderKey,
  PLATFORM_BRAIN_PROVIDER_KEYS,
} from "@/lib/platform/ai-providers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;

  const body = await req.json();
  const providerKey = String(body.providerKey || "").toUpperCase() as PlatformBrainProviderKey;

  if (!PLATFORM_BRAIN_PROVIDER_KEYS.includes(providerKey)) {
    return NextResponse.json({ error: "مزوّد غير مدعوم" }, { status: 400 });
  }

  await disconnectPlatformAiProvider({
    providerKey,
    userId: session!.user.id,
  });

  return NextResponse.json({ ok: true });
}
