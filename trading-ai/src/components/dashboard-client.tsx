"use client";

import { useEffect, useState } from "react";
import type { Signal } from "@/types/trading";

interface BacktestData {
  symbol: string;
  result: {
    finalEquity: number;
    totalReturnPct: number;
    maxDrawdownPct: number;
    trades: number;
  };
  reproducibilityHash: string;
}

export function DashboardClient() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [backtest, setBacktest] = useState<BacktestData | null>(null);
  const [mode, setMode] = useState("loading");
  const [symbol, setSymbol] = useState("AAPL");

  useEffect(() => {
    fetch("/api/signals?symbols=AAPL,MSFT,GOOGL,TSLA")
      .then((r) => r.json())
      .then((d) => {
        setSignals(d.signals ?? []);
        setMode(d.mode ?? "mock");
      });
  }, []);

  async function runBacktest() {
    const res = await fetch(`/api/backtest?symbol=${symbol}`);
    const data = await res.json();
    setBacktest(data);
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Live Signals</h2>
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase">
            {mode}
          </span>
        </div>
        {signals.length === 0 ? (
          <p className="mt-4 text-zinc-500">No active crossover signals.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {signals.map((s) => (
              <li
                key={`${s.symbol}-${s.direction}`}
                className="flex items-center justify-between rounded-lg bg-zinc-950 p-3"
              >
                <div>
                  <span className="font-medium">{s.symbol}</span>
                  <span
                    className={`ml-2 text-xs uppercase ${
                      s.direction === "long"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {s.direction}
                  </span>
                </div>
                <span className="text-sm text-zinc-400">
                  {(s.strength * 100).toFixed(1)}% · ${s.price_at_signal.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-medium">Backtest</h2>
        <div className="mt-4 flex gap-2">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm uppercase outline-none focus:border-emerald-500"
            placeholder="Symbol"
          />
          <button
            type="button"
            onClick={runBacktest}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950"
          >
            Run
          </button>
        </div>
        {backtest && (
          <div className="mt-4 space-y-2 text-sm">
            <p>
              Final equity:{" "}
              <strong>${backtest.result.finalEquity.toLocaleString()}</strong>
            </p>
            <p>Return: {backtest.result.totalReturnPct.toFixed(4)}%</p>
            <p>Max drawdown: {backtest.result.maxDrawdownPct.toFixed(4)}%</p>
            <p>Trades: {backtest.result.trades}</p>
            <p className="text-xs text-zinc-500">
              Hash: {backtest.reproducibilityHash}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
