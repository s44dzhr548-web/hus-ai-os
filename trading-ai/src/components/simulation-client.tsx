"use client";

import { useEffect, useState } from "react";
import type { PortfolioSimulationResult } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { StatCard } from "./trading-shell";

export function SimulationClient() {
  const { t } = useI18n();
  const [capital, setCapital] = useState(100_000);
  const [sim, setSim] = useState<PortfolioSimulationResult | null>(null);

  async function runSim() {
    const res = await fetch(`/api/intelligence/simulation?capital=${capital}`);
    const data = await res.json();
    setSim(data.simulation);
  }

  useEffect(() => {
    runSim();
  }, []);

  return (
    <div className="space-y-6 text-start">
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          value={capital}
          onChange={(e) => setCapital(Number(e.target.value))}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          aria-label={t.simulation.capital}
        />
        <button type="button" onClick={runSim} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950">
          {t.simulation.run}
        </button>
      </div>

      {sim && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label={t.simulation.finalEquity} value={`$${sim.finalEquity.toLocaleString()}`} />
            <StatCard label={t.simulation.totalReturn} value={`${sim.totalReturnPct}%`} />
            <StatCard label={t.simulation.maxDrawdown} value={`${sim.maxDrawdownPct}%`} />
            <StatCard label={t.simulation.winRate} value={`${sim.winRate}%`} sub={`${sim.trades} ${t.simulation.trades}`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label={t.simulation.bestTrade}
              value={sim.bestTrade ? `${sim.bestTrade.symbol} +${sim.bestTrade.pnlPct}%` : "—"}
            />
            <StatCard
              label={t.simulation.worstTrade}
              value={sim.worstTrade ? `${sim.worstTrade.symbol} ${sim.worstTrade.pnlPct}%` : "—"}
            />
          </div>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="font-medium">{t.simulation.equityCurve}</h3>
            <div className="mt-4 flex h-32 items-end gap-1">
              {sim.equityCurve.map((pt) => (
                <div
                  key={pt.date}
                  className="flex-1 rounded-t bg-emerald-500/50"
                  style={{ height: `${Math.max(4, (pt.equity / sim.initialCapital) * 100)}%` }}
                />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-zinc-300">
            <p>{t.simulation.vsBuyHold}: {sim.buyHoldReturnPct}%</p>
            <p className="mt-1">{t.simulation.vsIndex}: {sim.indexBenchmarkReturnPct}%</p>
            <p className="mt-3 text-xs text-amber-400/80">{t.simulation.disclaimer}</p>
          </section>
        </>
      )}
    </div>
  );
}
