"use client";

import { useState } from "react";
import type { AIDebateResult } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { RecommendationBadge } from "./trading-shell";

export function AIDebateClient() {
  const { t, locale } = useI18n();
  const [symbol, setSymbol] = useState("AAPL");
  const [debate, setDebate] = useState<AIDebateResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await fetch(`/api/intelligence/debate?symbol=${symbol}&lang=${locale}`);
    setDebate(await res.json());
    setLoading(false);
  }

  return (
    <div className="space-y-6 text-start">
      <div className="flex gap-2">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm uppercase" />
        <button type="button" onClick={run} disabled={loading} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50">
          {loading ? t.common.loading : t.aiDebate.run}
        </button>
      </div>
      {debate && (
        <>
          <div className="flex items-center gap-3">
            <span className="font-semibold">{debate.symbol}</span>
            <RecommendationBadge rec={debate.recommendation} />
            <span className="text-sm text-zinc-400">{(debate.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {debate.agents.map((a) => (
              <article key={a.role} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h3 className="font-medium">{locale === "ar" ? a.labelAr : a.labelEn}</h3>
                <p className="mt-2 text-2xl font-semibold text-emerald-400">{a.score}</p>
                <p className="mt-2 text-sm text-zinc-400">{locale === "ar" ? a.argumentAr : a.argumentEn}</p>
              </article>
            ))}
          </div>
          <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm">
            {locale === "ar" ? debate.finalVerdictAr : debate.finalVerdictEn}
          </section>
        </>
      )}
    </div>
  );
}
