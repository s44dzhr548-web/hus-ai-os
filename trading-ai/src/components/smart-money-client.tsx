"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SmartMoneySnapshot, FlowOpportunity, SectorRotation, FlowOpportunityScore } from "@/lib/intelligence/smart-money-types";
import type { OpportunityGrade } from "@/lib/intelligence/opportunity-score";
import { filterPremiumGrades } from "@/lib/intelligence/opportunity-score";
import { profilePathForSymbol } from "@/lib/intelligence/symbol-resolver";
import { RecommendationBadge, StatCard } from "./trading-shell";
import { useI18n } from "@/lib/i18n/context";

function FlowBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return <span className={`text-lg font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>{up ? "+" : ""}{pct}%</span>;
}

function gradeTone(grade: OpportunityGrade): string {
  if (grade === "A+") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (grade === "A") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (grade === "B") return "bg-sky-500/10 text-sky-300 border-sky-500/20";
  if (grade === "C") return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  return "bg-red-500/10 text-red-300 border-red-500/20";
}

function gradeLabel(grade: OpportunityGrade, sm: ReturnType<typeof useI18n>["t"]["smartMoney"]): string {
  switch (grade) {
    case "A+":
      return sm.gradeAPlus;
    case "A":
      return sm.gradeA;
    case "B":
      return sm.gradeB;
    case "C":
      return sm.gradeC;
    default:
      return sm.gradeAvoid;
  }
}

function ScoreBreakdown({
  breakdown,
  sm,
}: {
  breakdown: FlowOpportunityScore;
  sm: ReturnType<typeof useI18n>["t"]["smartMoney"];
}) {
  const rows = [
    { label: sm.scoreMoneyFlow, value: breakdown.moneyFlow, weight: "25%" },
    { label: sm.scoreTechnical, value: breakdown.technical, weight: "20%" },
    { label: sm.scoreFundamentals, value: breakdown.fundamentals, weight: "20%" },
    { label: sm.scoreNews, value: breakdown.newsSentiment, weight: "15%" },
    { label: sm.scoreMacro, value: breakdown.macro, weight: "10%" },
    { label: sm.scoreRisk, value: breakdown.riskManagement, weight: "10%" },
  ];

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{sm.scoreBreakdown}</p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 text-zinc-400">{row.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${row.value}%` }} />
          </div>
          <span className="w-10 text-end text-zinc-300">{row.value}</span>
          <span className="w-8 text-end text-[10px] text-zinc-600">{row.weight}</span>
        </div>
      ))}
    </div>
  );
}

function OpportunityRow({
  item,
  locale,
  sm,
}: {
  item: FlowOpportunity;
  locale: "en" | "ar";
  sm: ReturnType<typeof useI18n>["t"]["smartMoney"];
}) {
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
          <div className="flex items-center justify-end gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${gradeTone(item.grade)}`}>
              {gradeLabel(item.grade, sm)}
            </span>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{item.score}</p>
              <p className="text-xs text-zinc-500">{sm.opportunityScore} /100</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <RecommendationBadge rec={item.recommendation} />
        <span className="rounded bg-zinc-800 px-2 py-0.5">{item.flowDirection}</span>
        <span className="rounded bg-zinc-800 px-2 py-0.5">{item.timeHorizon}</span>
        {item.volumeAnomaly && <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-300">{sm.volumeAnomaly}</span>}
      </div>
      <p className="mt-2 rounded-lg border border-sky-500/10 bg-sky-500/5 px-3 py-2 text-xs text-sky-200">{sm.multiSignalNote}</p>
      <ScoreBreakdown breakdown={item.breakdown} sm={sm} />
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
  const [showAllGrades, setShowAllGrades] = useState(false);

  useEffect(() => {
    fetch("/api/smart-money/flow")
      .then((r) => r.json())
      .then((d) => setData(d.flow ?? null));
  }, []);

  if (!data) return <p className="text-zinc-500">{t.common.loading}</p>;

  const cards = data.dashboardCards;
  const tabItems = getSmartMoneyTabItems(data, tab);
  const visibleItems = showAllGrades ? tabItems : filterPremiumGrades(tabItems);

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">{sm.paperOnly}</div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <h3 className="text-sm font-medium text-emerald-300">{sm.formulaTitle}</h3>
        <p className="mt-1 text-xs text-zinc-400">
          {sm.scoreMoneyFlow} 25% · {sm.scoreTechnical} 20% · {sm.scoreFundamentals} 20% · {sm.scoreNews} 15% · {sm.scoreMacro} 10% · {sm.scoreRisk} 10%
        </p>
        <p className="mt-2 text-xs text-sky-200">{sm.multiSignalNote}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={sm.strongestInflow} value={`+${cards.strongestInflow.flowPct}%`} sub={locale === "ar" ? cards.strongestInflow.labelAr : cards.strongestInflow.label} />
        <StatCard label={sm.strongestOutflow} value={`${cards.strongestOutflow.flowPct}%`} sub={locale === "ar" ? cards.strongestOutflow.labelAr : cards.strongestOutflow.label} />
        <StatCard label={sm.regime} value={locale === "ar" ? data.regimeLabelAr : data.regimeLabelEn} />
        <StatCard label={sm.bestOpportunity} value={cards.bestOpportunity?.displaySymbol ?? "—"} sub={cards.bestOpportunity ? `${cards.bestOpportunity.score}/100 · ${cards.bestOpportunity.grade}` : ""} />
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
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
          <button
            type="button"
            onClick={() => setShowAllGrades((v) => !v)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-500/40"
          >
            {showAllGrades ? sm.showPremiumOnly : sm.showAllGrades}
          </button>
        </div>
        {visibleItems.length === 0 && (
          <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">{sm.noPremiumOpportunities}</p>
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {visibleItems.map((item) => (
            <OpportunityRow key={item.symbol} item={item} locale={locale} sm={sm} />
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
