import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import {
  connectPlatformAiProvider,
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
    const result = await connectPlatformAiProvider({
      providerKey,
      apiKey: String(body.apiKey || ""),
      modelId: body.modelId ? String(body.modelId) : undefined,
      roleAssignments: Array.isArray(body.roleAssignments) ? body.roleAssignments : undefined,
      userId: session!.user.id,
      testAfterSave: body.testAfterSave !== false,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل الربط" },
      { status: 400 }
    );
  }
}
