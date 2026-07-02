"use client";

import { useEffect, useState } from "react";
import type { PaperPortfolio } from "@/types/trading";
import { RecommendationBadge, StatCard } from "./trading-shell";
import { useI18n } from "@/lib/i18n/context";

export function PaperClient() {
  const { t } = useI18n();
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
  const [symbol, setSymbol] = useState("AAPL");
  const [quantity, setQuantity] = useState(10);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch("/api/paper");
    const data = await res.json();
    setPortfolio(data.portfolio ?? null);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function order(side: "buy" | "sell") {
    setError("");
    const res = await fetch("/api/paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "order", symbol, side, quantity }),
    });
    const data = await res.json();
    if (!data.ok) setError(data.error ?? t.common.error);
    setPortfolio(data.portfolio ?? null);
  }

  async function reset() {
    await fetch("/api/paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    refresh();
  }

  if (!portfolio) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
        {t.paper.banner}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.paper.cash} value={`$${portfolio.cash.toLocaleString()}`} />
        <StatCard label={t.paper.equity} value={`$${portfolio.equity.toLocaleString()}`} />
        <StatCard
          label={t.paper.totalPnl}
          value={`$${portfolio.totalPnl.toLocaleString()}`}
          sub={`${portfolio.totalPnlPct}%`}
        />
        <StatCard label={t.paper.openPositions} value={String(portfolio.openPositions.length)} />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.paper.placeOrder}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm uppercase"
            placeholder={t.common.symbol}
          />
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            min={1}
          />
          <button type="button" onClick={() => order("buy")} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950">
            {t.paper.buy}
          </button>
          <button type="button" onClick={() => order("sell")} className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-300">
            {t.paper.sell}
          </button>
          <button type="button" onClick={reset} className="rounded-lg border border-zinc-600 px-4 py-2 text-sm">
            {t.paper.reset}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>

      {portfolio.openPositions.length > 0 && (
        <section className="rounded-xl border border-zinc-800 overflow-x-auto">
          <h3 className="border-b border-zinc-800 bg-zinc-900/80 p-3 font-medium">{t.paper.openPositions}</h3>
          <table className="w-full text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="p-3 text-start">{t.common.symbol}</th>
                <th className="p-3 text-start">{t.paper.qty}</th>
                <th className="p-3 text-start">{t.paper.entry}</th>
                <th className="p-3 text-start">{t.paper.current}</th>
                <th className="p-3 text-start">{t.paper.unrealizedPnl}</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.openPositions.map((p) => (
                <tr key={p.id} className="border-t border-zinc-800/50">
                  <td className="p-3 font-medium">{p.symbol}</td>
                  <td className="p-3">{p.quantity}</td>
                  <td className="p-3">${p.avgEntryPrice.toFixed(2)}</td>
                  <td className="p-3">${p.currentPrice.toFixed(2)}</td>
                  <td className={`p-3 ${p.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${p.unrealizedPnl} ({p.unrealizedPnlPct}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {portfolio.missedSignals.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{t.paper.missedSignals}</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            {portfolio.missedSignals.slice(0, 5).map((m, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                {m.symbol} <RecommendationBadge rec={m.recommendation} /> — {m.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
