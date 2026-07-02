"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { StatCard } from "./trading-shell";

type CostRow = {
  id: string;
  providerEn: string;
  providerAr: string;
  marketEn: string;
  marketAr: string;
  liveData: boolean;
  historicalData: boolean;
  freeTierEn: string;
  freeTierAr: string;
  paidTierEn: string;
  paidTierAr: string;
  estimatedMonthlyUsd: number;
  prosEn: string[];
  prosAr: string[];
  consEn: string[];
  consAr: string[];
  recommendedUsageEn: string;
  recommendedUsageAr: string;
};

export function ProviderCostsClient() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<CostRow[]>([]);
  const [dashboard, setDashboard] = useState<{ currentMonthCostUsd: number; estimatedEndOfMonthUsd: number; tiers: { labelEn: string; labelAr: string; estimatedMonthlyUsd: number; descriptionEn: string; descriptionAr: string }[] } | null>(null);

  useEffect(() => {
    fetch("/api/market/providers/cost").then((r) => r.json()).then((d) => {
      setRows(d.providers ?? []);
      setDashboard(d.dashboard ?? null);
    });
  }, []);

  if (!dashboard) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label={t.providerCosts.current} value={`$${dashboard.currentMonthCostUsd}`} />
        <StatCard label={t.providerCosts.estimated} value={`$${dashboard.estimatedEndOfMonthUsd}`} />
      </div>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.providerCosts.tiers}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dashboard.tiers.map((tier) => (
            <div key={tier.labelEn} className="rounded-lg bg-zinc-950/50 p-3 text-sm">
              <p className="font-medium">{locale === "ar" ? tier.labelAr : tier.labelEn}</p>
              <p className="text-emerald-400">${tier.estimatedMonthlyUsd}/mo</p>
              <p className="mt-1 text-zinc-500">{locale === "ar" ? tier.descriptionAr : tier.descriptionEn}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="space-y-4">
        {rows.map((r) => (
          <article key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-medium">{locale === "ar" ? r.providerAr : r.providerEn}</h3>
              <span className="text-emerald-400">${r.estimatedMonthlyUsd}/mo est.</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{locale === "ar" ? r.marketAr : r.marketEn}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-zinc-400">
              <p>{t.providerCosts.free}: {locale === "ar" ? r.freeTierAr : r.freeTierEn}</p>
              <p>{t.providerCosts.paid}: {locale === "ar" ? r.paidTierAr : r.paidTierEn}</p>
              <p>{t.providerCosts.live}: {r.liveData ? "✓" : "—"} · {t.providerCosts.historical}: {r.historicalData ? "✓" : "—"}</p>
            </div>
            <p className="mt-3 text-sm">{locale === "ar" ? r.recommendedUsageAr : r.recommendedUsageEn}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
