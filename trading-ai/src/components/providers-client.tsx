"use client";

import { useEffect, useState } from "react";
import type { DataQualityScore } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { StatCard, Badge } from "./trading-shell";

type ProviderStatus = {
  dataMode: string;
  demoFallbackActive: boolean;
  missingApiKeys: string[];
  liveMarkets: string[];
  demoMarkets: string[];
  brokerExecution: string;
  paperTradingOnly: boolean;
  providers: { id: string; name: string; status: string; hasApiKey: boolean }[];
  verification: { id: string; status: string; latencyMs?: number }[];
};

export function ProvidersClient() {
  const { t } = useI18n();
  const [data, setData] = useState<ProviderStatus | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityScore | null>(null);
  const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean; timezone: string; session: string } | null>(null);

  useEffect(() => {
    fetch("/api/market/providers/status")
      .then((r) => r.json())
      .then(setData);
    fetch("/api/intelligence/platform?type=data-quality")
      .then((r) => r.json())
      .then(setDataQuality);
    fetch("/api/market/status?exchange=NASDAQ")
      .then((r) => r.json())
      .then(setMarketStatus);
  }, []);

  if (!data) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label={t.providers.dataMode} value={data.dataMode.toUpperCase()} sub={data.demoFallbackActive ? t.providers.demoActive : t.providers.liveActive} />
        <StatCard label={t.providers.liveMarkets} value={String(data.liveMarkets.length)} />
        <StatCard label={t.providers.demoMarkets} value={String(data.demoMarkets.length)} />
        <StatCard label={t.providers.broker} value={data.brokerExecution} sub={t.providers.paperOnly} />
      </div>

      {dataQuality && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="font-medium">{t.dataQuality.title}</h3>
          <p className="mt-2 text-3xl font-semibold text-emerald-400">{dataQuality.score}/100</p>
          <p className="mt-1 text-sm text-zinc-400">{t.dataQuality.score}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {dataQuality.breakdown.map((b) => (
              <li key={b.factorEn} className="flex justify-between">
                <span>{b.factorEn}</span>
                <span>{b.points}/{b.maxPoints}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {marketStatus && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{t.providers.marketStatus}</h3>
          <p className="mt-2 text-sm text-zinc-400">
            {marketStatus.session} · {marketStatus.timezone} ·{" "}
            <Badge tone={marketStatus.isOpen ? "buy" : "hold"}>{marketStatus.isOpen ? t.providers.open : t.providers.closed}</Badge>
          </p>
        </section>
      )}

      {data.missingApiKeys.length > 0 && (
        <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="font-medium text-amber-300">{t.providers.missingKeys}</h3>
          <p className="mt-2 text-sm text-zinc-400">{data.missingApiKeys.join(", ")}</p>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.providers.providerGrid}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.providers.map((p) => (
            <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                <Badge tone={p.status === "live" || p.status === "ready" ? "buy" : p.hasApiKey ? "hold" : "neutral"}>
                  {p.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{p.hasApiKey ? t.providers.keyPresent : t.providers.keyMissing}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
