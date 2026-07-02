"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SmartMoneySnapshot, FlowOpportunity, SectorRotation } from "@/lib/intelligence/smart-money-types";
import { profilePathForSymbol } from "@/lib/intelligence/symbol-resolver";
import { RecommendationBadge, StatCard } from "./trading-shell";
import { useI18n } from "@/lib/i18n/context";

function FlowBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return <span className={`text-lg font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>{up ? "+" : ""}{pct}%</span>;
}

function OpportunityRow({ item, locale }: { item: FlowOpportunity; locale: "en" | "ar" }) {
  const exp = locale === "ar" ? item.explanationAr : item.explanationEn;
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={profilePathForSymbol(item.symbol, item.displaySymbol)} className="font-semibold hover:text-emerald-300">
            {item.displaySymbol}
          </Link>
          <p className="text-xs text-zinc-500">{item.name} · {item.sector}</p>
        </div>
        <div className="text-end">
          <p className="text-2xl font-bold text-emerald-400">{item.score}</p>
          <p className="text-xs text-zinc-500">/100</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <RecommendationBadge rec={item.recommendation} />
        <span className="rounded bg-zinc-800 px-2 py-0.5">{item.flowDirection}</span>
        <span className="rounded bg-zinc-800 px-2 py-0.5">{item.timeHorizon}</span>
        {item.volumeAnomaly && <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-300">volume anomaly</span>}
      </div>
      <p className="mt-2 text-xs text-zinc-400">{exp.whyMoving}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {locale === "ar" ? "عائد متوقع" : "Expected return"}: {item.expectedReturnPct >= 0 ? "+" : ""}
        {item.expectedReturnPct}% · {locale === "ar" ? "ثقة" : "conf"} {(item.confidence * 100).toFixed(0)}% · {locale === "ar" ? "مخاطر" : "risk"} {item.riskScore}
      </p>
    </article>
  );
}

function RotationCard({ r, locale }: { r: SectorRotation; locale: "en" | "ar" }) {
  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
      <p className="font-medium">
        {locale === "ar" ? r.fromSectorAr : r.fromSector} → {locale === "ar" ? r.toSectorAr : r.toSector}
      </p>
      <p className="mt-1 text-sm text-zinc-400">{locale === "ar" ? r.reasonAr : r.reasonEn}</p>
      <p className="mt-2 text-xs text-amber-300">{locale === "ar" ? r.riskWarningAr : r.riskWarningEn}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {r.watchSymbols.map((sym) => (
          <Link key={sym} href={profilePathForSymbol(sym)} className="text-xs text-emerald-400 hover:underline">
            {sym}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SmartMoneyClient() {
  const { t, locale } = useI18n();
  const sm = t.smartMoney;
  const [data, setData] = useState<SmartMoneySnapshot | null>(null);
  const [tab, setTab] = useState("best_inflow");

  useEffect(() => {
    fetch("/api/smart-money/flow")
      .then((r) => r.json())
      .then((d) => setData(d.flow ?? null));
  }, []);

  if (!data) return <p className="text-zinc-500">{t.common.loading}</p>;

  const cards = data.dashboardCards;
  const tabItems = getSmartMoneyTabItems(data, tab);

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">{sm.paperOnly}</div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={sm.strongestInflow} value={`+${cards.strongestInflow.flowPct}%`} sub={locale === "ar" ? cards.strongestInflow.labelAr : cards.strongestInflow.label} />
        <StatCard label={sm.strongestOutflow} value={`${cards.strongestOutflow.flowPct}%`} sub={locale === "ar" ? cards.strongestOutflow.labelAr : cards.strongestOutflow.label} />
        <StatCard label={sm.regime} value={locale === "ar" ? data.regimeLabelAr : data.regimeLabelEn} />
        <StatCard label={sm.bestOpportunity} value={cards.bestOpportunity?.displaySymbol ?? "—"} sub={cards.bestOpportunity ? `${cards.bestOpportunity.score}/100` : ""} />
        <StatCard label={sm.highestRisk} value={cards.highestRisk?.displaySymbol ?? "—"} sub={cards.highestRisk ? `${cards.highestRisk.riskScore} risk` : ""} />
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{sm.assetFlows}</h3>
        <p className="mt-1 text-xs text-zinc-500">{data.period}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.assetFlows.map((f) => (
            <div key={f.id} className="rounded-lg bg-zinc-950/50 p-3">
              <p className="text-sm font-medium">{locale === "ar" ? f.labelAr : f.labelEn}</p>
              <FlowBadge pct={f.flowPct} />
              <p className="mt-1 text-[10px] uppercase text-zinc-500">{f.institutionalSignal} · {f.trendType}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{sm.sectorInflows}</h3>
          <ul className="mt-3 space-y-2">
            {data.sectorInflows.slice(0, 6).map((s) => (
              <li key={s.sector} className="flex justify-between text-sm">
                <span>{locale === "ar" ? s.sectorAr : s.sector}</span>
                <FlowBadge pct={s.flowPct} />
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{sm.sectorOutflows}</h3>
          <ul className="mt-3 space-y-2">
            {data.sectorOutflows.slice(0, 6).map((s) => (
              <li key={s.sector} className="flex justify-between text-sm">
                <span>{locale === "ar" ? s.sectorAr : s.sector}</span>
                <FlowBadge pct={s.flowPct} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{sm.rotations}</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {data.rotations.map((r, i) => (
            <RotationCard key={`${r.fromSector}-${r.toSector}-${i}`} r={r} locale={locale} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{sm.aiExplanation}</h3>
        <p className="mt-2 text-sm text-zinc-400">{locale === "ar" ? data.aiExplanationAr : data.aiExplanationEn}</p>
        <p className="mt-2 text-xs text-zinc-500">{locale === "ar" ? data.summaryAr : data.summaryEn}</p>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ["best_inflow", sm.tabBestInflow],
            ["saudi", sm.tabSaudi],
            ["us", sm.tabUs],
            ["crypto", sm.tabCrypto],
            ["gold_oil", sm.tabGoldOil],
            ["low_risk", sm.tabLowRisk],
            ["momentum", sm.tabMomentum],
            ["early_rotation", sm.tabRotation],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-xs ${tab === id ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {tabItems.map((item) => (
            <OpportunityRow key={item.symbol} item={item} locale={locale} />
          ))}
        </div>
      </section>
    </div>
  );
}

function getSmartMoneyTabItems(data: SmartMoneySnapshot, tab: string): FlowOpportunity[] {
  switch (tab) {
    case "saudi":
      return data.rankings.saudi;
    case "us":
      return data.rankings.us;
    case "crypto":
      return data.rankings.crypto;
    case "gold_oil":
      return data.rankings.goldOil;
    case "low_risk":
      return data.rankings.lowRisk;
    case "momentum":
      return data.rankings.highMomentum;
    case "early_rotation":
      return data.rankings.earlyRotation;
    default:
      return data.rankings.bestInflow;
  }
}
