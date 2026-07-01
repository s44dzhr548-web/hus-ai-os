"use client";

import type { AISignalScore, MarketAsset } from "@/types/trading";
import { RecommendationBadge, RiskBadge } from "./trading-shell";

export function MarketCard({ asset, signal }: { asset: MarketAsset; signal?: AISignalScore }) {
  const up = asset.changePct >= 0;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{asset.symbol}</p>
          <p className="text-xs text-zinc-500">{asset.name}</p>
        </div>
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase text-zinc-400">
          {asset.assetClass}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold">${asset.price.toLocaleString()}</p>
      <p className={`text-sm ${up ? "text-emerald-400" : "text-red-400"}`}>
        {up ? "+" : ""}
        {asset.changePct.toFixed(2)}%
      </p>
      {signal && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
          <RecommendationBadge rec={signal.recommendation} />
          <RiskBadge level={signal.riskLevel} />
          <span className="text-xs text-zinc-500">Score {signal.score}</span>
          <span className="text-xs text-zinc-500">Conf {(signal.confidence * 100).toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
