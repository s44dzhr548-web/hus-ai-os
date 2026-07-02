"use client";

import { useCallback, useEffect, useState } from "react";
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

type VerificationRow = {
  id: string;
  name: string;
  connected: boolean;
  isLive: boolean;
  hasApiKey: boolean;
  latencyMs?: number;
  error?: string;
};

type LiveMarket = { market: string; symbol: string; source: string; price?: number };
type DemoMarket = { market: string; symbol: string; reason: string };

type StatusPayload = {
  dataMode: string;
  demoFallbackActive: boolean;
  missingApiKeys: string[];
  automaticFailover: boolean;
  verifiedAt?: string;
  verification?: VerificationRow[];
  liveMarkets?: LiveMarket[];
  demoMarkets?: DemoMarket[];
  manager: {
    strategy: string;
    activeByMarket: Record<string, string>;
    failoverEvents: { fromProvider: string; toProvider: string; reason: string; createdAt: string }[];
    providers: ManagerProvider[];
  };
  cost: { currentMonthCostUsd: number; estimatedEndOfMonthUsd: number; totalApiCalls: number };
  logStats: { cacheHits: number; cacheMisses: number; switches: number; avgLatency: number };
  cache: { memory: { size: number }; disk: { size: number }; redisConfigured: boolean };
};

const REFRESH_MS = 60_000;

function formatTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function ProvidersClient() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityScore | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [statusRes, qualityRes] = await Promise.all([
        fetch("/api/market/providers/status"),
        fetch("/api/intelligence/platform?type=data-quality"),
      ]);
      setData(await statusRes.json());
      setDataQuality(await qualityRes.json());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (!data) return <p className="text-zinc-500">{t.common.loading}</p>;

  const verificationMap = new Map((data.verification ?? []).map((v) => [v.id, v]));

  return (
    <div className="space-y-6 text-start">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm flex-1">{t.providers.enterpriseNote}</div>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          {refreshing ? t.common.loading : t.providers.refresh}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label={t.providers.dataMode} value={data.dataMode.toUpperCase()} />
        <StatCard
          label={data.demoFallbackActive ? t.providers.demoActive : t.providers.liveActive}
          value={data.demoFallbackActive ? t.providers.demoBadge : t.providers.liveBadge}
        />
        <StatCard label={t.providers.failover} value={data.automaticFailover ? t.providers.on : t.providers.off} />
        <StatCard label={t.providers.monthlyCost} value={`$${data.cost.currentMonthCostUsd}`} sub={`Est $${data.cost.estimatedEndOfMonthUsd}`} />
        <StatCard label={t.providers.apiCalls} value={String(data.cost.totalApiCalls)} />
        <StatCard label={t.providers.avgLatency} value={`${data.logStats.avgLatency}ms`} />
      </div>

      {data.verifiedAt && (
        <p className="text-xs text-zinc-500">
          {t.providers.verifiedAt}: {formatTime(data.verifiedAt, locale)}
        </p>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.providers.activeByMarket}</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4 text-sm">
          {Object.entries(data.manager.activeByMarket).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-zinc-950/50 p-3">
              <p className="text-xs text-zinc-500 uppercase">{k.replace(/_/g, " ")}</p>
              <p className="mt-1 font-medium">{v}</p>
              <p className="mt-1 text-xs text-zinc-500">{t.providers.servingProvider}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">{t.providers.strategy}: {data.manager.strategy}</p>
      </section>

      {(data.liveMarkets?.length ?? 0) > 0 && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="font-medium">{t.providers.liveMarkets}</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="text-start py-1">{t.providers.marketCol}</th>
                  <th>{t.providers.symbolCol}</th>
                  <th>{t.providers.sourceCol}</th>
                  <th>{t.providers.priceCol}</th>
                  <th>{t.providers.liveBadge}</th>
                </tr>
              </thead>
              <tbody>
                {data.liveMarkets!.map((m) => (
                  <tr key={m.market} className="border-t border-emerald-500/10">
                    <td className="py-2">{m.market}</td>
                    <td className="text-center">{m.symbol}</td>
                    <td className="text-center">{m.source}</td>
                    <td className="text-center">{m.price ?? "—"}</td>
                    <td className="text-center"><Badge tone="buy">{t.providers.liveBadge}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(data.demoMarkets?.length ?? 0) > 0 && (
        <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="font-medium">{t.providers.demoMarkets}</h3>
          <ul className="mt-3 space-y-1 text-sm text-zinc-400">
            {data.demoMarkets!.map((m) => (
              <li key={m.market}>{m.market} ({m.symbol}): {m.reason}</li>
            ))}
          </ul>
        </section>
      )}

      {data.missingApiKeys.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{t.providers.missingKeys}</h3>
          <p className="mt-2 text-sm text-zinc-400">{data.missingApiKeys.join(" · ")}</p>
        </section>
      )}

      {dataQuality && (
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="font-medium">{t.dataQuality.title}</h3>
          <p className="mt-2 text-3xl font-semibold text-emerald-400">{dataQuality.score}/100</p>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 overflow-x-auto">
        <h3 className="font-medium">{t.providers.healthGrid}</h3>
        <table className="mt-4 w-full min-w-[960px] text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="text-start py-2">{t.providers.providerCol}</th>
              <th>{t.providers.statusCol}</th>
              <th>{t.providers.liveBadge}</th>
              <th>{t.providers.latencyCol}</th>
              <th>{t.providers.lastUpdateCol}</th>
              <th>{t.providers.usageCol}</th>
              <th>{t.providers.errorsCol}</th>
              <th>{t.providers.availabilityCol}</th>
              <th>{t.providers.roleCol}</th>
            </tr>
          </thead>
          <tbody>
            {data.manager.providers.map((p) => {
              const v = verificationMap.get(p.id);
              const live = v?.connected && v?.isLive;
              return (
                <tr key={p.id} className="border-t border-zinc-800">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="text-center">
                    <Badge tone={p.status === "healthy" ? "buy" : p.status === "degraded" ? "hold" : "sell"}>{p.status}</Badge>
                  </td>
                  <td className="text-center">
                    <Badge tone={live ? "buy" : "sell"}>{live ? t.providers.liveBadge : t.providers.demoBadge}</Badge>
                  </td>
                  <td className="text-center">{v?.latencyMs ?? p.latencyMs}ms</td>
                  <td className="text-center text-xs text-zinc-400">{formatTime(p.lastUpdate, locale)}</td>
                  <td className="text-center">{p.apiUsage}</td>
                  <td className="text-center">{p.errors}</td>
                  <td className="text-center">{p.availabilityPct}%</td>
                  <td className="text-center">{p.isActive ? t.providers.activeRole : t.providers.backupRole}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {data.manager.failoverEvents.length > 0 && (
        <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="font-medium">{t.providers.failoverLog}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.manager.failoverEvents.map((e, i) => (
              <li key={i}>
                {formatTime(e.createdAt, locale)} — {e.fromProvider} → {e.toProvider}: {e.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-zinc-600">
        {t.providers.cacheLayers}: memory {data.cache.memory.size} · disk {data.cache.disk.size} · redis {data.cache.redisConfigured ? t.providers.on : t.providers.off}
        {" · "}
        {t.providers.rateLimitNote}
      </p>
    </div>
  );
}
