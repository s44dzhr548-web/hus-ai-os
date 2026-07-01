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

          <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="font-medium">{t.analysis.explanation}</h3>
            <ol className="mt-3 list-decimal space-y-2 text-sm text-zinc-300">
              {analysis.explanation.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-amber-400/80">{analysis.complianceNote}</p>
          </section>
        </div>
      )}
    </div>
  );
}
