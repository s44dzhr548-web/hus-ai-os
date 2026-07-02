"use client";

import { useEffect, useState } from "react";
import type { CEODashboardData } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { StatCard, Badge, RecommendationBadge } from "./trading-shell";

export function CEODashboardClient() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<CEODashboardData | null>(null);

  useEffect(() => {
    fetch("/api/intelligence/ceo")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">{t.disclaimer.body}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.ceo.paperPnl} value={`${data.paperPerformance.totalPnlPct.toFixed(1)}%`} />
        <StatCard label={t.ceo.botStatus} value={data.botStatus.running ? t.autoBot.active : t.autoBot.paused} />
        <StatCard label={t.ceo.marketHealth} value={String(data.marketHealth.score.score)} sub={locale === "ar" ? data.marketHealth.score.labelAr : data.marketHealth.score.labelEn} />
        <StatCard label={t.ceo.providers} value={`${data.providerStatus.live} live`} sub={`${data.providerStatus.pendingKeys.length} keys pending`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{t.ceo.opportunities}</h3>
          <ul className="mt-3 space-y-2">
            {data.topOpportunities.map((o) => (
              <li key={o.symbol} className="flex justify-between text-sm">
                <span>{o.symbol} — {locale === "ar" ? o.reasonAr : o.reasonEn}</span>
                <span className="text-emerald-400">{o.score}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{t.ceo.risks}</h3>
          <ul className="mt-3 space-y-2">
            {data.topRisks.map((r, i) => (
              <li key={i} className="text-sm">
                <Badge tone="risk">{r.severity}</Badge>
                <p className="mt-1">{locale === "ar" ? r.titleAr : r.titleEn}</p>
                <p className="text-xs text-zinc-500">{locale === "ar" ? r.detailAr : r.detailEn}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.ceo.topRecs}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.topRecommendations.map((r) => (
            <div key={r.symbol} className="rounded-lg bg-zinc-950/50 px-3 py-2 text-sm">
              {r.symbol} · <RecommendationBadge rec={r.recommendation} /> · {(r.confidence * 100).toFixed(0)}%
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.ceo.alerts}</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          {data.alerts.slice(0, 5).map((a) => (
            <li key={a.id}>{a.title}: {a.message}</li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-zinc-600">{t.ceo.brokerOff} · {data.compliance.paperTradingOnly ? t.ceo.paperOnly : ""}</p>
    </div>
  );
}
