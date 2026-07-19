import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import {
  testPlatformAiProvider,
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

  try {
    const result = await testPlatformAiProvider({
      providerKey,
      userId: session!.user.id,
      apiKey: body.apiKey ? String(body.apiKey) : undefined,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل الاختبار" },
      { status: 400 }
    );
  }
}
