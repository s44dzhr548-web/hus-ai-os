"use client";

import { useEffect, useState } from "react";
import type { GlobalMarketBrain } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { RecommendationBadge } from "./trading-shell";

export function MarketBrainClient() {
  const { t, locale } = useI18n();
  const [brain, setBrain] = useState<GlobalMarketBrain | null>(null);

  useEffect(() => {
    fetch("/api/intelligence/market-brain").then((r) => r.json()).then(setBrain);
  }, []);

  if (!brain) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.marketBrain.regions}</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {brain.regions.map((r) => (
            <div key={r.id} className="rounded-lg bg-zinc-950/50 p-3 text-sm">
              <p>{locale === "ar" ? r.nameAr : r.nameEn}</p>
              <p className="text-zinc-500">{t.marketBrain.health}: {r.health}</p>
              <RecommendationBadge rec={r.trend} />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.marketBrain.macro}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(brain.macroDrivers).map(([key, v]) => (
            <div key={key} className="rounded-lg bg-zinc-950/50 p-3 text-sm">
              <p className="font-medium capitalize">{key}: {v.value}</p>
              <p className="mt-1 text-zinc-400">{locale === "ar" ? v.impactAr : v.impactEn}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.marketBrain.insights}</h3>
        <ul className="mt-3 space-y-3 text-sm">
          {brain.crossMarketInsights.map((i) => (
            <li key={i.id} className="rounded-lg bg-zinc-950/50 p-3">
              <p className="font-medium">{locale === "ar" ? i.titleAr : i.titleEn}</p>
              <p className="text-zinc-400">{locale === "ar" ? i.impactAr : i.impactEn}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
