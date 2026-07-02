"use client";

import { useEffect, useState } from "react";
import type { DataQualityScore } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { StatCard, Badge } from "./trading-shell";

type ManagerProvider = {
  id: string;
  name: string;
  status: string;
  latencyMs: number;
  lastUpdate: string;
  apiUsage: number;
  monthlyCostUsd: number;
  quotaRemaining?: number;
  errors: number;
  availabilityPct: number;
  isActive: boolean;
  isBackup: boolean;
  automaticSwitching: boolean;
};

type StatusPayload = {
  dataMode: string;
  demoFallbackActive: boolean;
  missingApiKeys: string[];
  automaticFailover: boolean;
  manager: { strategy: string; activeByMarket: Record<string, string>; failoverEvents: { fromProvider: string; toProvider: string; reason: string; createdAt: string }[]; providers: ManagerProvider[] };
  cost: { currentMonthCostUsd: number; estimatedEndOfMonthUsd: number; totalApiCalls: number };
  logStats: { cacheHits: number; cacheMisses: number; switches: number; avgLatency: number };
  cache: { memory: { size: number }; disk: { size: number }; redisConfigured: boolean };
};

export function ProvidersClient() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityScore | null>(null);

  useEffect(() => {
    fetch("/api/market/providers/status").then((r) => r.json()).then(setData);
    fetch("/api/intelligence/platform?type=data-quality").then((r) => r.json()).then(setDataQuality);
  }, []);

  if (!data) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">{t.providers.enterpriseNote}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={t.providers.dataMode} value={data.dataMode.toUpperCase()} />
        <StatCard label={t.providers.failover} value={data.automaticFailover ? t.providers.on : t.providers.off} />
        <StatCard label={t.providers.monthlyCost} value={`$${data.cost.currentMonthCostUsd}`} sub={`Est $${data.cost.estimatedEndOfMonthUsd}`} />
        <StatCard label={t.providers.apiCalls} value={String(data.cost.totalApiCalls)} />
        <StatCard label={t.providers.avgLatency} value={`${data.logStats.avgLatency}ms`} />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.providers.activeByMarket}</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
          {Object.entries(data.manager.activeByMarket).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-zinc-950/50 p-3">
              <p className="text-xs text-zinc-500 uppercase">{k}</p>
              <p className="mt-1">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">{t.providers.strategy}: {data.manager.strategy}</p>
      </section>

      {dataQuality && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="font-medium">{t.dataQuality.title}</h3>
          <p className="mt-2 text-3xl font-semibold text-emerald-400">{dataQuality.score}/100</p>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 overflow-x-auto">
        <h3 className="font-medium">{t.providers.healthGrid}</h3>
        <table className="mt-4 w-full min-w-[800px] text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="text-start py-2">{t.providers.providerCol}</th>
              <th>{t.providers.statusCol}</th>
              <th>{t.providers.latencyCol}</th>
              <th>{t.providers.usageCol}</th>
              <th>{t.providers.costCol}</th>
              <th>{t.providers.quotaCol}</th>
              <th>{t.providers.errorsCol}</th>
              <th>{t.providers.availabilityCol}</th>
              <th>{t.providers.roleCol}</th>
            </tr>
          </thead>
          <tbody>
            {data.manager.providers.map((p) => (
              <tr key={p.id} className="border-t border-zinc-800">
                <td className="py-2 font-medium">{p.name}</td>
                <td className="text-center"><Badge tone={p.status === "healthy" ? "buy" : p.status === "degraded" ? "hold" : "sell"}>{p.status}</Badge></td>
                <td className="text-center">{p.latencyMs}ms</td>
                <td className="text-center">{p.apiUsage}</td>
                <td className="text-center">${p.monthlyCostUsd}</td>
                <td className="text-center">{p.quotaRemaining ?? "—"}</td>
                <td className="text-center">{p.errors}</td>
                <td className="text-center">{p.availabilityPct}%</td>
                <td className="text-center">{p.isActive ? t.providers.activeRole : t.providers.backupRole}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {data.manager.failoverEvents.length > 0 && (
        <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="font-medium">{t.providers.failoverLog}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.manager.failoverEvents.map((e, i) => (
              <li key={i}>{e.fromProvider} → {e.toProvider}: {e.reason}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-zinc-600">
        {t.providers.cacheLayers}: memory {data.cache.memory.size} · disk {data.cache.disk.size} · redis {data.cache.redisConfigured ? t.providers.on : t.providers.off}
      </p>
    </div>
  );
}
