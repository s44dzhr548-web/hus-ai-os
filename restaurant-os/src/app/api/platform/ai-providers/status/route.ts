import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/api-auth";
import { listPlatformAiProviderStatus } from "@/lib/platform/ai-providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const providers = await listPlatformAiProviderStatus();
  return NextResponse.json({ providers });
}
