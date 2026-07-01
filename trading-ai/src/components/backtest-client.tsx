"use client";

import { useState } from "react";
import type { StrategyBacktest } from "@/types/trading";

export function BacktestClient() {
  const [symbol, setSymbol] = useState("AAPL");
  const [result, setResult] = useState<{ result: StrategyBacktest["result"]; hash: string; strategy: string } | null>(null);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm uppercase"
        />
        <button type="button" onClick={runSingle} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950">
          Run SMA Backtest
        </button>
        <button type="button" onClick={runCompare} className="rounded-lg border border-zinc-600 px-4 py-2 text-sm">
          Compare Strategies
        </button>
      </div>

      {result && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Final Equity", `$${result.result.finalEquity.toLocaleString()}`],
            ["Return", `${result.result.totalReturnPct.toFixed(2)}%`],
            ["Win Rate", `${result.result.winRate}%`],
            ["Max Drawdown", `${result.result.maxDrawdownPct.toFixed(2)}%`],
            ["P/L", `$${result.result.profitLoss.toLocaleString()}`],
            ["Risk/Reward", String(result.result.riskRewardRatio)],
            ["Trades", String(result.result.trades)],
            ["Hash", result.hash.slice(0, 24) + "…"],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs text-zinc-500">{l}</p>
              <p className="mt-1 font-semibold">{v}</p>
            </div>
          ))}
        </div>
      )}

      {comparison.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-left text-zinc-500">
              <tr>
                <th className="p-3">Strategy</th>
                <th className="p-3">Return</th>
                <th className="p-3">Win Rate</th>
                <th className="p-3">Drawdown</th>
                <th className="p-3">P/L</th>
                <th className="p-3">R:R</th>
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
