"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Badge } from "./trading-shell";

type Config = {
  id: string;
  enabled: boolean;
  priority: number;
  weight: number;
  fallbackEnabled: boolean;
  rateLimitPerMinute: number;
  hasApiKey: boolean;
};

export function ProviderConfigClient() {
  const { t } = useI18n();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [strategy, setStrategy] = useState("");

  useEffect(() => {
    fetch("/api/market/providers/config").then((r) => r.json()).then((d) => {
      setConfigs(d.configs ?? []);
      setStrategy(d.priorityStrategy ?? "ai_auto");
    });
  }, []);

  async function toggle(id: string, enabled: boolean) {
    await fetch("/api/market/providers/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    fetch("/api/market/providers/config").then((r) => r.json()).then((d) => setConfigs(d.configs ?? []));
  }

  if (!configs.length) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">{t.providerConfig.securityNote}</div>
      <p className="text-sm text-zinc-400">{t.providerConfig.strategy}: <strong>{strategy}</strong></p>
      <div className="grid gap-3">
        {configs.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div>
              <p className="font-medium">{c.id}</p>
              <p className="text-xs text-zinc-500">{t.providerConfig.priority} {c.priority} · {t.providerConfig.weight} {c.weight} · {t.providerConfig.rateLimit} {c.rateLimitPerMinute}/min</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={c.hasApiKey ? "buy" : "hold"}>{c.hasApiKey ? t.providers.keyPresent : t.providers.keyMissing}</Badge>
              <button type="button" onClick={() => toggle(c.id, !c.enabled)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm">
                {c.enabled ? t.providerConfig.disable : t.providerConfig.enable}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
