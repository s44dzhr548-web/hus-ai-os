"use client";

import { useState } from "react";
import type { AIAnalysis } from "@/types/trading";
import { RecommendationBadge, RiskBadge } from "./trading-shell";
import { useI18n } from "@/lib/i18n/context";

export function AnalysisClient() {
  const { t, locale } = useI18n();
  const [symbol, setSymbol] = useState("AAPL");
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    const res = await fetch(`/api/analysis?symbol=${symbol}&lang=${locale}`);
    const data = await res.json();
    setAnalysis(data.analysis ?? null);
    setLoading(false);
  }

  return (
    <div className="space-y-6 text-start">
      <div className="flex flex-wrap gap-2">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          aria-label={t.common.symbol}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm uppercase outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
        >
          {loading ? t.analysis.analyzing : t.analysis.run}
        </button>
      </div>

      {analysis && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">{analysis.symbol}</h2>
            <RecommendationBadge rec={analysis.recommendation} />
            <RiskBadge level={analysis.riskLevel} />
            <span className="text-sm text-zinc-400">
              {t.common.score} {analysis.signalScore}/100
            </span>
            <span className="text-sm text-zinc-400">
              {t.common.confidence} {(analysis.confidence * 100).toFixed(0)}%
            </span>
          </div>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="font-medium">{t.analysis.technical}</h3>
            <p className="mt-2 text-sm text-zinc-400">{analysis.technical.summary}</p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <p>
                {t.analysis.rsi}: {analysis.technical.rsi}
              </p>
              <p>
                {t.analysis.support}: ${analysis.technical.support}
              </p>
              <p>
                {t.analysis.resistance}: ${analysis.technical.resistance}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="font-medium">{t.analysis.news}</h3>
            <ul className="mt-3 space-y-2">
              {analysis.newsImpact.map((n, i) => (
                <li key={i} className="text-sm text-zinc-400">
                  <span
                    className={
                      n.sentiment === "positive"
                        ? "text-emerald-400"
                        : n.sentiment === "negative"
                          ? "text-red-400"
                          : ""
                    }
                  >
                    [{t.sentiment[n.sentiment]}]
                  </span>{" "}
                  {n.headline} — {n.source}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="font-medium">{t.analysis.macro}</h3>
            <p className="mt-2 text-sm text-zinc-400">{analysis.sectorImpact.summary}</p>
            <p className="mt-2 text-sm text-zinc-500">
              {t.analysis.oilImpact}: {(analysis.macroFactors.oilImpact * 100).toFixed(0)}% · {t.analysis.rates}:{" "}
              {(Math.abs(analysis.macroFactors.ratesImpact) * 100).toFixed(0)}%
            </p>
            <ul className="mt-3 space-y-1 text-sm text-zinc-400">
              {analysis.marketCorrelation.map((c) => (
                <li key={c.index}>
                  {c.index}: {(c.correlation * 100).toFixed(0)}% {t.common.correlation}
                </li>
              ))}
            </ul>
          </section>

          {analysis.whyNow && (
            <section className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5">
              <h3 className="font-medium">{t.analysis.whyNowTitle}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ExplainRow label={t.analysis.whyNow} text={locale === "ar" ? analysis.whyNow.whyNow.ar : analysis.whyNow.whyNow.en} />
                <ExplainRow label={t.analysis.whyNotYesterday} text={locale === "ar" ? analysis.whyNow.whyNotYesterday.ar : analysis.whyNow.whyNotYesterday.en} />
                <ExplainRow label={t.analysis.whyNotTomorrow} text={locale === "ar" ? analysis.whyNow.whyNotTomorrow.ar : analysis.whyNow.whyNotTomorrow.en} />
                <ExplainRow label={t.analysis.whatChanged} text={locale === "ar" ? analysis.whyNow.whatChanged.ar : analysis.whyNow.whatChanged.en} />
              </div>
            </section>
          )}

          {analysis.marketConsensus && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h3 className="font-medium">{t.analysis.consensusTitle}</h3>
              <p className="mt-2 text-3xl font-semibold text-emerald-400">{analysis.marketConsensus.consensusPct}%</p>
              <p className="mt-1 text-sm text-zinc-400">{locale === "ar" ? analysis.marketConsensus.summaryAr : analysis.marketConsensus.summaryEn}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {analysis.marketConsensus.sources.map((s) => (
                  <div key={s.id} className="flex justify-between rounded-lg bg-zinc-950/50 p-2 text-xs">
                    <span>{locale === "ar" ? s.labelAr : s.labelEn}</span>
                    <span>{s.direction.toUpperCase()} · {s.score.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {analysis.qualityScore && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h3 className="font-medium">{t.analysis.qualityTitle}</h3>
              <p className="mt-2 text-sm text-zinc-400">{locale === "ar" ? analysis.qualityScore.summaryAr : analysis.qualityScore.summaryEn}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
                <div><span className="text-zinc-500">{t.common.confidence}</span><p>{(analysis.qualityScore.confidence * 100).toFixed(0)}%</p></div>
                <div><span className="text-zinc-500">Providers</span><p>{analysis.qualityScore.providerCount}</p></div>
                <div><span className="text-zinc-500">Technical</span><p>{analysis.qualityScore.technicalScore}</p></div>
                <div><span className="text-zinc-500">News</span><p>{analysis.qualityScore.newsScore}</p></div>
                <div><span className="text-zinc-500">Macro</span><p>{analysis.qualityScore.macroScore}</p></div>
                <div><span className="text-zinc-500">Liquidity</span><p>{analysis.qualityScore.liquidityScore}</p></div>
                <div><span className="text-zinc-500">Risk</span><p>{analysis.qualityScore.riskScore}</p></div>
                <div><span className="text-zinc-500">Data</span><p>{analysis.qualityScore.dataStatus}</p></div>
              </div>
              {analysis.qualityScore.validationWarning && (
                <p className="mt-3 text-sm text-amber-400">{analysis.qualityScore.validationWarning}</p>
              )}
            </section>
          )}

          {analysis.contributions && (
            <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
              <h3 className="font-medium">{t.analysis.contributionsTitle}</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-5 text-sm">
                <ContributionBar label={t.analysis.contribTechnical} pct={analysis.contributions.technicalPct} />
                <ContributionBar label={t.analysis.contribNews} pct={analysis.contributions.newsPct} />
                <ContributionBar label={t.analysis.contribMacro} pct={analysis.contributions.macroPct} />
                <ContributionBar label={t.analysis.contribSector} pct={analysis.contributions.sectorPct} />
                <ContributionBar label={t.analysis.contribRisk} pct={analysis.contributions.riskPct} />
              </div>
              <p className="mt-3 text-sm text-zinc-400">{locale === "ar" ? analysis.contributions.whyNowAr : analysis.contributions.whyNowEn}</p>
              <p className="mt-2 text-sm text-amber-300/80">{locale === "ar" ? analysis.contributions.invalidationAr : analysis.contributions.invalidationEn}</p>
              <p className="mt-2 text-xs text-zinc-500">{t.analysis.reviewBy}: {new Date(analysis.contributions.nextReviewAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}</p>
            </section>
          )}

          {analysis.whatMustChange?.length > 0 && (
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h3 className="font-medium">{t.analysis.whatMustChangeTitle}</h3>
              <ul className="mt-3 space-y-3">
                {analysis.whatMustChange.map((rule) => (
                  <li key={rule.id} className="text-sm">
                    <p className="text-zinc-300">{locale === "ar" ? rule.conditionAr : rule.conditionEn}</p>
                    <p className="text-emerald-400">↓ {rule.newRecommendation.toUpperCase()}</p>
                    <p className="text-xs text-zinc-500">{locale === "ar" ? rule.triggerAr : rule.triggerEn}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="font-medium">{t.analysis.explanation}</h3>
            <ol className="mt-3 list-decimal space-y-2 text-sm text-zinc-300">
              {analysis.explanation.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ol>
            {analysis.explainability && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <ExplainRow label={t.analysis.explainTechnical} text={locale === "ar" ? analysis.explainability.technical.ar : analysis.explainability.technical.en} />
                <ExplainRow label={t.analysis.explainFundamental} text={locale === "ar" ? analysis.explainability.fundamental.ar : analysis.explainability.fundamental.en} />
                <ExplainRow label={t.analysis.explainNews} text={locale === "ar" ? analysis.explainability.news.ar : analysis.explainability.news.en} />
                <ExplainRow label={t.analysis.explainSector} text={locale === "ar" ? analysis.explainability.sector.ar : analysis.explainability.sector.en} />
                <ExplainRow label={t.analysis.explainMacro} text={locale === "ar" ? analysis.explainability.macro.ar : analysis.explainability.macro.en} />
                <ExplainRow label={t.analysis.explainOil} text={locale === "ar" ? analysis.explainability.oilImpact.ar : analysis.explainability.oilImpact.en} />
                <ExplainRow label={t.analysis.explainRates} text={locale === "ar" ? analysis.explainability.ratesImpact.ar : analysis.explainability.ratesImpact.en} />
                <ExplainRow label={t.analysis.explainEconomic} text={locale === "ar" ? analysis.explainability.economicEvent.ar : analysis.explainability.economicEvent.en} />
                <ExplainRow label={t.analysis.explainCorrelation} text={locale === "ar" ? analysis.explainability.correlation.ar : analysis.explainability.correlation.en} />
                <ExplainRow label={t.analysis.explainRisk} text={locale === "ar" ? analysis.explainability.risk.ar : analysis.explainability.risk.en} />
                <ExplainRow label={t.analysis.explainConfidence} text={locale === "ar" ? analysis.explainability.confidence.ar : analysis.explainability.confidence.en} />
                <ExplainRow label={t.analysis.explainInvalidation} text={locale === "ar" ? analysis.explainability.invalidation.ar : analysis.explainability.invalidation.en} tone="amber" />
                <ExplainRow label={t.analysis.explainMonitor} text={locale === "ar" ? analysis.explainability.monitorNext.ar : analysis.explainability.monitorNext.en} />
              </div>
            )}
            {analysis.explainability && (
              <p className="mt-4 text-xs text-zinc-500">
                {t.analysis.reviewBy}: {new Date(analysis.explainability.reviewBy).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")} ·{" "}
                {analysis.explainability.dataSource === "demo" ? t.market.demoBadge : t.market.liveData}
                {analysis.explainability.provider ? ` · ${analysis.explainability.provider}` : ""}
              </p>
            )}
            <p className="mt-4 text-xs text-amber-400/80">{analysis.complianceNote}</p>
          </section>
        </div>
      )}
    </div>
  );
}

function ContributionBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-semibold">{pct}%</p>
    </div>
  );
}

function ExplainRow({ label, text, tone }: { label: string; text: string; tone?: "amber" }) {
  return (
    <div className={`rounded-lg p-3 text-sm ${tone === "amber" ? "border border-amber-500/20 bg-amber-500/5" : "bg-zinc-950/40"}`}>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-zinc-300">{text}</p>
    </div>
  );
}
