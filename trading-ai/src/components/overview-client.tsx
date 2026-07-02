"use client";

import { useEffect, useState } from "react";
import { MarketCard } from "./market-card";
import { StatCard } from "./trading-shell";
import { useI18n } from "@/lib/i18n/context";
import type { AISignalScore, MarketAsset } from "@/types/trading";

export function OverviewClient() {
  const { t } = useI18n();
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [signals, setSignals] = useState<AISignalScore[]>([]);
  const [mode, setMode] = useState("mock");
  const [modeSub, setModeSub] = useState("");
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
      setModeSub(
        market.mode === "live"
          ? t.overview.liveSub
          : market.mode === "mixed"
            ? t.overview.mixedSub
            : t.overview.mockSub
      );
      setUnread(alerts.unread ?? 0);
    });
  }, []);

  const signalMap = Object.fromEntries(signals.map((s) => [s.symbol, s]));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.overview.dataMode} value={mode.toUpperCase()} sub={modeSub || t.overview.mockSub} />
        <StatCard label={t.overview.assetsTracked} value={String(assets.length)} />
        <StatCard
          label={t.overview.activeSignals}
          value={String(signals.filter((s) => s.recommendation !== "hold").length)}
        />
        <StatCard label={t.overview.unreadAlerts} value={String(unread)} />
      </div>

      <section className="text-start">
        <h2 className="mb-4 text-lg font-medium">{t.overview.marketOverview}</h2>
        {assets.length === 0 ? (
          <p className="text-zinc-500">{t.common.empty}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.slice(0, 8).map((a) => (
              <MarketCard key={a.symbol} asset={a} signal={signalMap[a.symbol]} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
