"use client";

import { useEffect, useState } from "react";
import { MarketCard } from "./market-card";
import { StatCard } from "./trading-shell";
import type { AISignalScore, MarketAsset } from "@/types/trading";

export function OverviewClient() {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [signals, setSignals] = useState<AISignalScore[]>([]);
  const [mode, setMode] = useState("mock");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/market").then((r) => r.json()),
      fetch("/api/signals?format=ai").then((r) => r.json()),
      fetch("/api/alerts").then((r) => r.json()),
    ]).then(([market, sig, alerts]) => {
      setAssets(market.assets ?? []);
      setSignals(sig.signals ?? []);
      setMode(market.mode ?? "mock");
      setUnread(alerts.unread ?? 0);
    });
  }, []);

  const signalMap = Object.fromEntries(signals.map((s) => [s.symbol, s]));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Data Mode" value={mode.toUpperCase()} sub="Mock demo · no real money" />
        <StatCard label="Assets Tracked" value={String(assets.length)} />
        <StatCard label="Active Signals" value={String(signals.filter((s) => s.recommendation !== "hold").length)} />
        <StatCard label="Unread Alerts" value={String(unread)} />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-medium">Market Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.slice(0, 8).map((a) => (
            <MarketCard key={a.symbol} asset={a} signal={signalMap[a.symbol]} />
          ))}
        </div>
      </section>
    </div>
  );
}
