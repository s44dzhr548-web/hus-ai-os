import { NextResponse } from "next/server";
import { getAllProviderConfigs, getProviderConfig, updateProviderConfig } from "@/lib/market/provider-manager/config-store";
import { getActivePriorityStrategy } from "@/lib/market/provider-manager/priority";
import { KEYED_PROVIDER_ENV, PROVIDER_LABELS, PUBLIC_LIVE_PROVIDERS } from "@/lib/market/config";
import type { ProviderId } from "@/lib/market/types";

export async function GET() {
  const ids = Object.keys(PROVIDER_LABELS) as ProviderId[];
  const envMap: Record<string, string | undefined> = {};
  for (const [id, key] of Object.entries(KEYED_PROVIDER_ENV)) {
    envMap[id] = key;
  }
  return NextResponse.json({
    configs: getAllProviderConfigs(ids, envMap),
    priorityStrategy: getActivePriorityStrategy(),
    publicProviders: PUBLIC_LIVE_PROVIDERS,
    securityNote: "API keys stored in environment variables only — never exposed to client",
    brokerExecution: "DISABLED",
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = body.id as ProviderId;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const updated = updateProviderConfig(id, {
    enabled: body.enabled,
    priority: body.priority,
    weight: body.weight,
    fallbackEnabled: body.fallbackEnabled,
    rateLimitPerMinute: body.rateLimitPerMinute,
  });
  return NextResponse.json({ config: updated, note: "Runtime config only — API keys must be set via env" });
}
