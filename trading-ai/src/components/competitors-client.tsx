"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DisclaimerBanner } from "./disclaimer-banner";
import { LanguageSwitcher } from "./language-switcher";
import { DataModeBadge } from "./data-mode-badge";
import {
  COMPETITORS,
  FILTER_LABELS,
  PRICING_LABELS,
  ROADMAP,
  filterCompetitors,
  getComparisonMatrix,
  getCompetitiveAdvantages,
  getFeatureGapAnalysis,
} from "@/lib/competitors/data";
import type { CompetitorFilterTag } from "@/lib/competitors/types";
import { useI18n } from "@/lib/i18n/context";

const FILTER_KEYS = Object.keys(FILTER_LABELS) as CompetitorFilterTag[];

export function CompetitorsClient() {
  const { t, locale, dir } = useI18n();
  const [activeFilters, setActiveFilters] = useState<CompetitorFilterTag[]>([]);

  const competitors = useMemo(() => filterCompetitors(activeFilters), [activeFilters]);
  const matrix = useMemo(() => getComparisonMatrix(locale), [locale]);
  const gaps = getFeatureGapAnalysis();
  const advantages = getCompetitiveAdvantages();

  function toggleFilter(f: CompetitorFilterTag) {
    setActiveFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  const matrixCols = [
    { key: "charting" as const, label: t.competitors.matrix.charting },
    { key: "aiSignals" as const, label: t.competitors.matrix.aiSignals },
    { key: "backtesting" as const, label: t.competitors.matrix.backtesting },
    { key: "newsAnalysis" as const, label: t.competitors.matrix.newsAnalysis },
    { key: "fundamentalAnalysis" as const, label: t.competitors.matrix.fundamentalAnalysis },
    { key: "riskManagement" as const, label: t.competitors.matrix.riskManagement },
    { key: "arabicSupport" as const, label: t.competitors.matrix.arabicSupport },
    { key: "saudiMarketSupport" as const, label: t.competitors.matrix.saudiMarket },
    { key: "multiMarketSupport" as const, label: t.competitors.matrix.multiMarket },
    { key: "autoTrading" as const, label: t.competitors.matrix.autoTrading },
    { key: "paperTrading" as const, label: t.competitors.matrix.paperTrading },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50" dir={dir}>
      <DisclaimerBanner />
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="text-start">
            <Link href="/" className="text-xs uppercase tracking-widest text-emerald-400">
              {t.brand}
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">{t.competitors.title}</h1>
            <p className="text-sm text-zinc-500">{t.competitors.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher />
            <DataModeBadge />
            <Link href="/dashboard" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500">
              {t.home.openDashboard}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 text-start">
        {/* Filters */}
        <section>
          <h2 className="mb-3 text-lg font-medium">{t.competitors.filtersTitle}</h2>
          <div className="flex flex-wrap gap-2">
            {FILTER_KEYS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFilter(f)}
                className={`rounded-full px-3 py-1 text-xs ${
                  activeFilters.includes(f)
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800"
                }`}
              >
                {locale === "ar" ? FILTER_LABELS[f].ar : FILTER_LABELS[f].en}
              </button>
            ))}
            {activeFilters.length > 0 && (
              <button type="button" onClick={() => setActiveFilters([])} className="text-xs text-zinc-500 underline">
                {t.competitors.clearFilters}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {t.competitors.showing} {competitors.length} / {COMPETITORS.length}
          </p>
        </section>

        {/* Competitor cards */}
        <section className="grid gap-4 lg:grid-cols-2">
          {competitors.map((c) => (
            <article key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-semibold">{locale === "ar" ? c.nameAr : c.name}</h3>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                  {locale === "ar" ? PRICING_LABELS[c.pricingType].ar : PRICING_LABELS[c.pricingType].en}
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-400/80">{locale === "ar" ? c.categoryAr : c.category}</p>
              <ul className="mt-3 list-inside list-disc text-sm text-zinc-400">
                {(locale === "ar" ? c.mainFeaturesAr : c.mainFeatures).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs font-medium text-zinc-500">{t.competitors.strengths}</p>
                  <ul className="mt-1 space-y-1 text-zinc-400">
                    {(locale === "ar" ? c.strengthsAr : c.strengths).slice(0, 3).map((s) => (
                      <li key={s}>+ {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">{t.competitors.weaknesses}</p>
                  <ul className="mt-1 space-y-1 text-zinc-400">
                    {(locale === "ar" ? c.weaknessesAr : c.weaknesses).slice(0, 3).map((w) => (
                      <li key={w}>− {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                <span className="text-zinc-400">{t.competitors.targetUsers}:</span>{" "}
                {locale === "ar" ? c.targetUsersAr : c.targetUsers}
              </p>
              <p className="mt-2 text-xs text-amber-200/90">
                <span className="font-medium">{t.competitors.learnFrom}:</span>{" "}
                {locale === "ar" ? c.learnFromAr : c.learnFrom}
              </p>
              <p className="mt-1 text-xs text-emerald-300/90">
                <span className="font-medium">{t.competitors.husaiOpportunity}:</span>{" "}
                {locale === "ar" ? c.husaiOpportunityAr : c.husaiOpportunity}
              </p>
            </article>
          ))}
        </section>

        {/* Comparison matrix */}
        <section>
          <h2 className="mb-4 text-lg font-medium">{t.competitors.matrixTitle}</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[900px] text-xs">
              <thead className="bg-zinc-900/80 text-zinc-500">
                <tr>
                  <th className="p-2 text-start">{t.competitors.matrix.platform}</th>
                  {matrixCols.map((col) => (
                    <th key={col.key} className="p-2 text-center">
                      {col.label}
                    </th>
                  ))}
                  <th className="p-2 text-start">{t.competitors.matrix.opportunity}</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr
                    key={row.platform}
                    className={`border-t border-zinc-800/50 ${row.isHusai ? "bg-emerald-500/10" : ""}`}
                  >
                    <td className="p-2 font-medium">{row.platform}</td>
                    {matrixCols.map((col) => (
                      <td key={col.key} className="p-2 text-center">
                        {row[col.key] ? "✓" : "—"}
                      </td>
                    ))}
                    <td className="p-2 text-zinc-400">
                      {locale === "ar" ? row.husaiOpportunityAr : row.husaiOpportunity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Gap analysis */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-medium">{t.competitors.gapTitle}</h2>
            <div className="mt-4 space-y-4">
              {(["high", "medium", "low"] as const).map((pri) => (
                <div key={pri}>
                  <p className="text-xs uppercase tracking-wider text-amber-400">{t.competitors.priority[pri]}</p>
                  <ul className="mt-2 space-y-2">
                    {gaps
                      .filter((g) => g.priority === pri)
                      .map((g) => (
                        <li key={g.id} className="text-sm text-zinc-400">
                          <span className="font-medium text-zinc-200">
                            {locale === "ar" ? g.titleAr : g.titleEn}
                          </span>
                          <br />
                          {locale === "ar" ? g.descriptionAr : g.descriptionEn}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h2 className="text-lg font-medium">{t.competitors.advantagesTitle}</h2>
            <ul className="mt-4 space-y-3">
              {advantages.map((a) => (
                <li key={a.id} className="text-sm text-zinc-300">
                  <span className="font-medium text-emerald-300">{locale === "ar" ? a.titleAr : a.titleEn}</span>
                  <p className="text-zinc-400">{locale === "ar" ? a.descriptionAr : a.descriptionEn}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Roadmap */}
        <section>
          <h2 className="mb-4 text-lg font-medium">{t.competitors.roadmapTitle}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {ROADMAP.map((phase) => (
              <div key={phase.phase} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                <p className="text-xs text-emerald-400">{t.competitors.phase} {phase.phase}</p>
                <h3 className="mt-1 font-medium">{locale === "ar" ? phase.titleAr : phase.titleEn}</h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                  {(locale === "ar" ? phase.itemsAr : phase.itemsEn).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
