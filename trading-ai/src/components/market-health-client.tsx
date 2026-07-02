"use client";

import { useEffect, useState } from "react";
import type { MarketHealthDashboard, SmartMoneyFlowMap } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { StatCard, Badge } from "./trading-shell";

export function MarketHealthClient() {
  const { t, locale } = useI18n();
  const [health, setHealth] = useState<MarketHealthDashboard | null>(null);
  const [flow, setFlow] = useState<SmartMoneyFlowMap | null>(null);

  useEffect(() => {
    fetch("/api/intelligence/platform?type=market-health")
      .then((r) => r.json())
      .then(setHealth);
    fetch("/api/intelligence/platform?type=smart-money")
      .then((r) => r.json())
      .then(setFlow);
  }, []);

  if (!health) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-8 text-start">
      <StatCard
        label={t.marketHealth.score}
        value={`${health.score.score}/100`}
        sub={locale === "ar" ? health.score.labelAr : health.score.labelEn}
      />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.marketHealth.breakdown}</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {health.score.breakdown.map((b) => (
            <li key={b.factorEn} className="flex justify-between">
              <span>{locale === "ar" ? b.factorAr : b.factorEn}</span>
              <span className="text-emerald-400">{b.points}/{b.maxPoints}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {health.metrics.map((m) => (
          <div key={m.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">{locale === "ar" ? m.labelAr : m.labelEn}</p>
              <Badge tone={m.status === "bullish" ? "buy" : m.status === "bearish" ? "sell" : "hold"}>{m.value}</Badge>
            </div>
            <p className="mt-2 text-xs text-zinc-400">{locale === "ar" ? m.detailAr : m.detailEn}</p>
          </div>
        ))}
      </div>

      {flow && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{t.smartMoney.title}</h3>
          <p className="mt-1 text-xs text-zinc-500">{flow.period}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {flow.nodes.map((n) => (
              <div key={n.asset} className="rounded-lg bg-zinc-950/50 p-3 text-sm">
                <p>{locale === "ar" ? n.assetAr : n.asset}</p>
                <p className={n.direction === "in" ? "text-emerald-400" : n.direction === "out" ? "text-red-400" : "text-zinc-400"}>
                  {n.flowPct > 0 ? "+" : ""}{n.flowPct}%
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-zinc-400">{locale === "ar" ? flow.summaryAr : flow.summaryEn}</p>
        </section>
      )}
    </div>
  );
}
