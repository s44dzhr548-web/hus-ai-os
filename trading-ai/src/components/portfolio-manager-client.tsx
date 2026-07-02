"use client";

import { useEffect, useState } from "react";
import type { PortfolioManagerState } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { StatCard, Badge } from "./trading-shell";

export function PortfolioManagerClient() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<PortfolioManagerState | null>(null);

  useEffect(() => {
    fetch("/api/portfolio/manager").then((r) => r.json()).then(setState);
  }, []);

  if (!state) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">{t.portfolioManager.disclaimer}</div>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label={t.portfolioManager.equity} value={`$${state.totalEquity.toLocaleString()}`} />
        <StatCard label={t.portfolioManager.cash} value={`${state.cashPct}%`} />
        <StatCard label={t.portfolioManager.pnl} value={`${state.totalPnlPct}%`} />
        <StatCard label={t.portfolioManager.drawdown} value={`${state.drawdownPct}%`} />
      </div>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.portfolioManager.allocations}</h3>
        <div className="mt-3 space-y-2">
          {state.allocations.map((a) => (
            <div key={a.symbol} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-950/50 p-3 text-sm">
              <span>{a.symbol} · {a.sector}</span>
              <span>{a.currentWeightPct}% → {a.targetWeightPct}%</span>
              <Badge tone="risk">{a.riskBand}</Badge>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.portfolioManager.rebalance}</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          {state.rebalanceActions.map((a) => (
            <li key={a.symbol}>{a.symbol}: {locale === "ar" ? a.actionAr : a.actionEn}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
