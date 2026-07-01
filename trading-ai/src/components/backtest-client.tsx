"use client";

import { useState } from "react";
import type { StrategyBacktest } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";

export function BacktestClient() {
  const { t } = useI18n();
  const [symbol, setSymbol] = useState("AAPL");
  const [result, setResult] = useState<{ result: StrategyBacktest["result"]; hash: string; strategy: string } | null>(
    null
  );
  const [comparison, setComparison] = useState<StrategyBacktest[]>([]);

  async function runSingle() {
    const res = await fetch(`/api/backtest?symbol=${symbol}&strategy=sma-crossover`);
    const data = await res.json();
    setResult({ result: data.result, hash: data.reproducibilityHash, strategy: data.strategy });
  }

  async function runCompare() {
    const res = await fetch(`/api/backtest?symbol=${symbol}&compare=1`);
    const data = await res.json();
    setComparison(data.comparisons ?? []);
  }

  const metrics = result
    ? [
        [t.backtest.finalEquity, `$${result.result.finalEquity.toLocaleString()}`],
        [t.backtest.return, `${result.result.totalReturnPct.toFixed(2)}%`],
        [t.backtest.winRate, `${result.result.winRate}%`],
        [t.backtest.maxDrawdown, `${result.result.maxDrawdownPct.toFixed(2)}%`],
        [t.backtest.pl, `$${result.result.profitLoss.toLocaleString()}`],
        [t.backtest.riskReward, String(result.result.riskRewardRatio)],
        [t.backtest.trades, String(result.result.trades)],
        [t.backtest.hash, result.hash.slice(0, 24) + "…"],
      ]
    : [];

  return (
    <div className="space-y-6 text-start">
      <div className="flex flex-wrap gap-2">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm uppercase"
        />
        <button type="button" onClick={runSingle} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950">
          {t.backtest.runSma}
        </button>
        <button type="button" onClick={runCompare} className="rounded-lg border border-zinc-600 px-4 py-2 text-sm">
          {t.backtest.compare}
        </button>
      </div>

      {result && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([l, v]) => (
            <div key={String(l)} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs text-zinc-500">{l}</p>
              <p className="mt-1 font-semibold">{v}</p>
            </div>
          ))}
        </div>
      )}

      {comparison.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-500">
              <tr>
                <th className="p-3 text-start">{t.backtest.strategy}</th>
                <th className="p-3 text-start">{t.backtest.return}</th>
                <th className="p-3 text-start">{t.backtest.winRate}</th>
                <th className="p-3 text-start">{t.backtest.drawdown}</th>
                <th className="p-3 text-start">{t.backtest.pl}</th>
                <th className="p-3 text-start">{t.backtest.riskReward}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((c) => (
                <tr key={c.strategy} className="border-b border-zinc-800/50">
                  <td className="p-3 font-medium">{c.strategy}</td>
                  <td className="p-3">{c.result.totalReturnPct.toFixed(2)}%</td>
                  <td className="p-3">{c.result.winRate}%</td>
                  <td className="p-3">{c.result.maxDrawdownPct.toFixed(2)}%</td>
                  <td className="p-3">${c.result.profitLoss.toLocaleString()}</td>
                  <td className="p-3">{c.result.riskRewardRatio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
