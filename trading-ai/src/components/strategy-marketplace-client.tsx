"use client";

import { useEffect, useState } from "react";
import type { StrategyMarketplaceItem } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";

export function StrategyMarketplaceClient() {
  const { t, locale } = useI18n();
  const [strategies, setStrategies] = useState<StrategyMarketplaceItem[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/strategies/marketplace").then((r) => r.json()).then((d) => setStrategies(d.strategies ?? []));
  }, []);

  async function runBacktest(id: string) {
    setLoadingId(id);
    const res = await fetch("/api/strategies/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategyId: id, symbol: "AAPL" }),
    });
    const data = await res.json();
    const bt = data.backtest;
    setResults((prev) => ({
      ...prev,
      [id]: bt.totalReturnPct != null
        ? `${t.strategyMarketplace.return}: ${typeof bt.totalReturnPct === "number" ? bt.totalReturnPct.toFixed(1) : bt.totalReturnPct}% · WR ${bt.winRate}%`
        : bt.note ?? t.common.done,
    }));
    setLoadingId(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 text-start">
      {strategies.map((s) => (
        <article key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{locale === "ar" ? s.nameAr : s.nameEn}</h3>
          <p className="mt-2 text-sm text-zinc-400">{locale === "ar" ? s.descriptionAr : s.descriptionEn}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-500">
            <span>{t.strategyMarketplace.winRate}: {s.winRate}%</span>
            <span>{t.strategyMarketplace.return}: {s.totalReturnPct}%</span>
            <span>{t.strategyMarketplace.drawdown}: {s.maxDrawdownPct}%</span>
            <span>{t.strategyMarketplace.rr}: {s.riskReward}</span>
          </div>
          <button type="button" onClick={() => runBacktest(s.id)} disabled={loadingId === s.id} className="mt-4 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm text-zinc-950 disabled:opacity-50">
            {loadingId === s.id ? t.common.loading : t.strategyMarketplace.backtest}
          </button>
          {results[s.id] && <p className="mt-2 text-xs text-emerald-400">{results[s.id]}</p>}
        </article>
      ))}
    </div>
  );
}
