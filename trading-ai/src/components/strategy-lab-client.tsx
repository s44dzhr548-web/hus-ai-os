"use client";

import { useState } from "react";
import type { StrategyLabResult } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";

export function StrategyLabClient() {
  const { t, locale } = useI18n();
  const [symbol, setSymbol] = useState("AAPL");
  const [result, setResult] = useState<StrategyLabResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await fetch(`/api/intelligence/platform?type=strategy-lab&symbol=${symbol}`);
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div className="space-y-6 text-start">
      <div className="flex gap-2">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm uppercase" />
        <button type="button" onClick={run} disabled={loading} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50">
          {loading ? t.common.loading : t.strategyLab.run}
        </button>
      </div>

      {result && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-zinc-500">
              <tr>
                <th className="p-3 text-start">{t.strategyLab.strategy}</th>
                <th className="p-3 text-start">{t.backtest.winRate}</th>
                <th className="p-3 text-start">{t.backtest.return}</th>
                <th className="p-3 text-start">{t.backtest.drawdown}</th>
                <th className="p-3 text-start">{t.backtest.sharpe}</th>
                <th className="p-3 text-start">{t.backtest.trades}</th>
              </tr>
            </thead>
            <tbody>
              {result.strategies.map((s) => (
                <tr key={s.id} className="border-t border-zinc-800/50">
                  <td className="p-3">{locale === "ar" ? s.nameAr : s.nameEn}</td>
                  <td className="p-3">{s.winRate}%</td>
                  <td className="p-3">{s.totalReturnPct}%</td>
                  <td className="p-3">{s.maxDrawdownPct}%</td>
                  <td className="p-3">{s.sharpeLike}</td>
                  <td className="p-3">{s.trades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
