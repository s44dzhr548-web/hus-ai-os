"use client";

import Link from "next/link";
import type { MarketBrowseItem } from "@/lib/market/markets-browser";
import { profilePathForSymbol } from "@/lib/intelligence/symbol-resolver";
import { RecommendationBadge, RiskBadge } from "./trading-shell";
import { useAssetClassLabel, useI18n } from "@/lib/i18n/context";

function LogoBadge({ initials, color }: { initials: string; color: string }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}

export function MarketsAssetCard({ item }: { item: MarketBrowseItem }) {
  const { t } = useI18n();
  const classLabel = useAssetClassLabel(item.category);
  const up = item.changePct >= 0;
  const profileHref = profilePathForSymbol(item.symbol, item.displaySymbol);
  const sourceTone =
    item.dataSource === "live"
      ? "text-emerald-400 bg-emerald-500/10"
      : item.dataSource === "cached"
        ? "text-sky-400 bg-sky-500/10"
        : item.dataSource === "seeded"
          ? "text-violet-400 bg-violet-500/10"
          : "text-amber-400 bg-amber-500/10";

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-start transition hover:border-zinc-600">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-emerald-400">
            #{item.rank}
          </span>
          <LogoBadge initials={item.logo.initials} color={item.logo.color} />
          <div>
            <Link href={profileHref} className="font-semibold hover:text-emerald-300">
              {item.displaySymbol ?? item.symbol}
            </Link>
            <p className="text-xs text-zinc-500">{item.name}</p>
          </div>
        </div>
        <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${sourceTone}`}>
          {t.markets.dataSource[item.dataSource]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-500">
        <span className="rounded bg-zinc-800 px-2 py-0.5">{classLabel}</span>
        <span className="rounded bg-zinc-800 px-2 py-0.5">{item.market}</span>
        <span className="rounded bg-zinc-800 px-2 py-0.5">{item.exchange}</span>
        <span className="rounded bg-zinc-800 px-2 py-0.5">{item.sector}</span>
        {item.industry !== "—" && <span className="rounded bg-zinc-800 px-2 py-0.5">{item.industry}</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-zinc-500">{t.markets.price}</p>
          <p className="text-xl font-semibold">${item.price.toLocaleString()}</p>
          <div className="mt-1 space-y-0.5 text-xs">
            <p className={up ? "text-emerald-400" : "text-red-400"}>
              Day {up ? "+" : ""}
              {item.changePct.toFixed(2)}%
            </p>
            <p className={item.weekChangePct >= 0 ? "text-emerald-400/80" : "text-red-400/80"}>
              {t.markets.weekChange} {item.weekChangePct >= 0 ? "+" : ""}
              {item.weekChangePct.toFixed(2)}%
            </p>
            <p className={item.monthChangePct >= 0 ? "text-emerald-400/80" : "text-red-400/80"}>
              {t.markets.monthChange} {item.monthChangePct >= 0 ? "+" : ""}
              {item.monthChangePct.toFixed(2)}%
            </p>
          </div>
        </div>
        <div className="space-y-1 text-xs">
          <p>
            <span className="text-zinc-500">{t.markets.expectedReturn}: </span>
            <span className={item.expectedReturnPct >= 0 ? "text-emerald-400" : "text-red-400"}>
              {item.expectedReturnPct >= 0 ? "+" : ""}
              {item.expectedReturnPct.toFixed(2)}%
            </span>
          </p>
          <p>
            <span className="text-zinc-500">{t.markets.riskScore}: </span>
            {item.riskScore}/100
          </p>
          <p>
            <span className="text-zinc-500">{t.common.confidence}: </span>
            {(item.aiConfidence * 100).toFixed(0)}%
          </p>
          <p>
            <span className="text-zinc-500">{t.markets.aiOpportunity}: </span>
            {item.aiOpportunityScore}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
        <RecommendationBadge rec={item.recommendation} />
        <RiskBadge level={item.riskLevel} />
        <span className="text-xs text-zinc-500">
          {t.common.score} {item.signalScore}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{item.whySelected}</p>

      <Link
        href={profileHref}
        className="mt-3 inline-flex rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
      >
        {t.markets.viewProfile}
      </Link>
    </article>
  );
}
