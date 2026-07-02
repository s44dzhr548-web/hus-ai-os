"use client";

import { useEffect, useState } from "react";
import type { ConfidenceAnalytics, LearningRecord, LearningStats, PortfolioSimulationResult } from "@/types/trading";
import { useI18n, useRecommendationLabel } from "@/lib/i18n/context";
import { StatCard } from "./trading-shell";

export function PerformanceClient() {
  const { t } = useI18n();
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [confidence, setConfidence] = useState<ConfidenceAnalytics | null>(null);
  const [simulation, setSimulation] = useState<PortfolioSimulationResult | null>(null);

  useEffect(() => {
    fetch("/api/intelligence/performance")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setRecords(d.records ?? []);
        setConfidence(d.confidence);
        setSimulation(d.simulation);
      });
  }, []);

  if (!stats || !confidence || !simulation) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-8 text-start">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label={t.performance.accuracy} value={`${stats.accuracy}%`} />
        <StatCard label={t.performance.avgReturn} value={`${confidence.avgReturnAfterRecommendation}%`} />
        <StatCard label={t.performance.simReturn} value={`${simulation.totalReturnPct}%`} />
        <StatCard label={t.performance.maxDrawdown} value={`${simulation.maxDrawdownPct}%`} />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.performance.winByConfidence}</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {confidence.winRateByConfidence.map((row) => (
            <div key={row.range} className="rounded-lg bg-zinc-950/50 p-3 text-sm">
              <p className="text-zinc-500">{row.range}</p>
              <p className="text-lg font-semibold">{row.winRate}%</p>
              <p className="text-xs text-zinc-600">{row.correct}/{row.total}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsTable title={t.performance.winByMarket} rows={confidence.winRateByMarket.map((r) => ({ label: r.market, winRate: r.winRate, total: r.total }))} />
        <AnalyticsTable title={t.performance.winByRisk} rows={confidence.winRateByRisk.map((r) => ({ label: r.risk, winRate: r.winRate, total: r.total }))} />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.performance.bestWorst}</h3>
        <p className="mt-2 text-sm text-zinc-400">
          {t.performance.best}: <RecLabel rec={confidence.bestType.recommendation} /> ({confidence.bestType.winRate}%) · {t.performance.worst}:{" "}
          <RecLabel rec={confidence.worstType.recommendation} /> ({confidence.worstType.winRate}%)
        </p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.performance.simulation}</h3>
        <p className="mt-2 text-sm text-zinc-400">
          {t.performance.vsBuyHold}: {simulation.buyHoldReturnPct}% · {t.performance.vsIndex}: {simulation.indexBenchmarkReturnPct}%
        </p>
        <div className="mt-4 flex h-24 items-end gap-1">
          {simulation.equityCurve.slice(-20).map((pt) => (
            <div
              key={pt.date}
              className="flex-1 rounded-t bg-emerald-500/40"
              style={{ height: `${Math.max(8, (pt.equity / simulation.initialCapital) * 60)}%` }}
              title={`${pt.date}: $${pt.equity}`}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.performance.records}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="p-2 text-start">{t.common.symbol}</th>
                <th className="p-2 text-start">{t.learning.rec}</th>
                <th className="p-2 text-start">{t.common.confidence}</th>
                <th className="p-2 text-start">{t.performance.return}</th>
                <th className="p-2 text-start">{t.learning.result}</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 15).map((r) => (
                <tr key={r.id} className="border-t border-zinc-800/50">
                  <td className="p-2">{r.symbol}</td>
                  <td className="p-2"><RecLabel rec={r.recommendation} /></td>
                  <td className="p-2">{(r.confidence * 100).toFixed(0)}%</td>
                  <td className="p-2">{r.returnPct != null ? `${r.returnPct}%` : "—"}</td>
                  <td className={`p-2 ${r.wasCorrect ? "text-emerald-400" : r.resolvedAt ? "text-red-400" : ""}`}>
                    {r.resolvedAt ? (r.wasCorrect ? "✓" : "✗") : t.learning.pending}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AnalyticsTable({ title, rows }: { title: string; rows: { label: string; winRate: number; total: number }[] }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex justify-between">
            <span>{r.label}</span>
            <span className="text-emerald-400">{r.winRate}% ({r.total})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecLabel({ rec }: { rec: string }) {
  const label = useRecommendationLabel(rec);
  return <span>{label}</span>;
}
