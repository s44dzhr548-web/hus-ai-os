"use client";

import { useEffect, useState } from "react";
import { MarketCard } from "./market-card";
import { useI18n } from "@/lib/i18n/context";
import type { AISignalScore, MarketAsset } from "@/types/trading";

const DEFAULT = ["AAPL", "MSFT", "NVDA", "BTCUSD", "2222", "EURUSD"];

export function WatchlistClient() {
  const { t } = useI18n();
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT);
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [signals, setSignals] = useState<AISignalScore[]>([]);
  const [addSymbol, setAddSymbol] = useState("");

  useEffect(() => {
    load(watchlist);
  }, [watchlist]);

  async function load(symbols: string[]) {
    const [m, s] = await Promise.all([
      fetch("/api/market").then((r) => r.json()),
      fetch(`/api/signals?format=ai&symbols=${symbols.join(",")}`).then((r) => r.json()),
    ]);
    const all = (m.assets ?? []) as MarketAsset[];
    setAssets(all.filter((a) => symbols.includes(a.symbol)));
    setSignals(s.signals ?? []);
  }

  function add() {
    const sym = addSymbol.trim().toUpperCase();
    if (sym && !watchlist.includes(sym)) setWatchlist([...watchlist, sym]);
    setAddSymbol("");
  }

  const signalMap = Object.fromEntries(signals.map((s) => [s.symbol, s]));

  return (
    <div className="space-y-6 text-start">
      <div className="flex flex-wrap gap-2">
        <input
          value={addSymbol}
          onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
          placeholder={t.watchlist.placeholder}
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm uppercase outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950"
        >
          {t.common.add}
        </button>
      </div>
      {assets.length === 0 ? (
        <p className="text-zinc-500">{t.common.empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <MarketCard key={a.symbol} asset={a} signal={signalMap[a.symbol]} />
          ))}
        </div>
      )}
    </div>
  );
}
