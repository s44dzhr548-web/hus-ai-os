"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketCard } from "./market-card";
import { StatCard } from "./trading-shell";
import { useI18n } from "@/lib/i18n/context";
import type { AISignalScore, MarketAsset } from "@/types/trading";

type FlowCards = {
  strongestInflow: { label: string; labelAr: string; flowPct: number };
  strongestOutflow: { label: string; labelAr: string; flowPct: number };
  bestOpportunity: { displaySymbol: string; score: number } | null;
  highestRisk: { displaySymbol: string; riskScore: number } | null;
  topRotation: { fromSector: string; toSector: string; fromSectorAr: string; toSectorAr: string } | null;
};

export function OverviewClient() {
  const { t, locale } = useI18n();
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [signals, setSignals] = useState<AISignalScore[]>([]);
  const [mode, setMode] = useState("mock");
  const [modeSub, setModeSub] = useState("");
  const [unread, setUnread] = useState(0);
  const [flowCards, setFlowCards] = useState<FlowCards | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/market").then((r) => r.json()),
      fetch("/api/signals?format=ai").then((r) => r.json()),
      fetch("/api/alerts").then((r) => r.json()),
      fetch("/api/smart-money/flow").then((r) => r.json()),
    ]).then(([market, sig, alerts, flow]) => {
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
      setFlowCards(flow.flow?.dashboardCards ?? null);
    });
  }, [t.overview.liveSub, t.overview.mixedSub, t.overview.mockSub]);

  const signalMap = Object.fromEntries(signals.map((s) => [s.symbol, s]));
  const sm = t.smartMoney;

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

      {flowCards && (
        <section className="text-start">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium">{sm.title}</h2>
            <Link href="/dashboard/smart-money" className="text-sm text-emerald-400 hover:underline">
              {locale === "ar" ? "عرض الخريطة" : "View flow map"}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label={sm.strongestInflow} value={`+${flowCards.strongestInflow.flowPct}%`} sub={locale === "ar" ? flowCards.strongestInflow.labelAr : flowCards.strongestInflow.label} />
            <StatCard label={sm.strongestOutflow} value={`${flowCards.strongestOutflow.flowPct}%`} sub={locale === "ar" ? flowCards.strongestOutflow.labelAr : flowCards.strongestOutflow.label} />
            <StatCard
              label={sm.bestOpportunity}
              value={flowCards.bestOpportunity?.displaySymbol ?? "—"}
              sub={flowCards.bestOpportunity ? `${flowCards.bestOpportunity.score}/100` : ""}
            />
            <StatCard
              label={sm.highestRisk}
              value={flowCards.highestRisk?.displaySymbol ?? "—"}
              sub={flowCards.highestRisk ? `${flowCards.highestRisk.riskScore} risk` : ""}
            />
            <StatCard
              label={sm.rotations}
              value={flowCards.topRotation ? `${flowCards.topRotation.fromSector} → ${flowCards.topRotation.toSector}` : "—"}
              sub={flowCards.topRotation ? (locale === "ar" ? `${flowCards.topRotation.fromSectorAr} → ${flowCards.topRotation.toSectorAr}` : "") : ""}
            />
          </div>
        </section>
      )}

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
