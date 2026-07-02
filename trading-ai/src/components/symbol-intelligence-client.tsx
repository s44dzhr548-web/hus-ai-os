"use client";

import { useState } from "react";
import type { RecommendationTransition, WhyNowEngine } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { RecommendationBadge } from "./trading-shell";

type Module = "why-now" | "what-must-change";

export function SymbolIntelligenceClient({ module }: { module: Module }) {
  const { t, locale } = useI18n();
  const [symbol, setSymbol] = useState("AAPL");
  const [whyNow, setWhyNow] = useState<WhyNowEngine | null>(null);
  const [transitions, setTransitions] = useState<RecommendationTransition[]>([]);
  const [rec, setRec] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/intelligence/modules?module=${module}&symbol=${symbol}&lang=${locale}`);
    const data = await res.json();
    setWhyNow(data.whyNow ?? null);
    setTransitions(data.transitions ?? []);
    setRec(data.recommendation ?? "");
    setLoading(false);
  }

  return (
    <div className="space-y-6 text-start">
      <div className="flex gap-2">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm uppercase" />
        <button type="button" onClick={load} disabled={loading} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50">
          {loading ? t.common.loading : t.common.run}
        </button>
      </div>
      {rec && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">{t.common.symbol}:</span>
          <RecommendationBadge rec={rec} />
        </div>
      )}
      {module === "why-now" && whyNow && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card label={t.analysis.whyNow} text={locale === "ar" ? whyNow.whyNow.ar : whyNow.whyNow.en} />
          <Card label={t.analysis.whyNotYesterday} text={locale === "ar" ? whyNow.whyNotYesterday.ar : whyNow.whyNotYesterday.en} />
          <Card label={t.analysis.whyNotTomorrow} text={locale === "ar" ? whyNow.whyNotTomorrow.ar : whyNow.whyNotTomorrow.en} />
          <Card label={t.analysis.whatChanged} text={locale === "ar" ? whyNow.whatChanged.ar : whyNow.whatChanged.en} />
        </div>
      )}
      {module === "what-must-change" && transitions.length > 0 && (
        <ul className="space-y-4">
          {transitions.map((tr, i) => (
            <li key={i} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
              <p className="font-medium text-emerald-400">{tr.from.toUpperCase()} → {tr.to.toUpperCase()}</p>
              <p className="mt-2 text-zinc-300">{locale === "ar" ? tr.conditionAr : tr.conditionEn}</p>
              <p className="mt-1 text-zinc-500">{locale === "ar" ? tr.triggerAr : tr.triggerEn}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-sm text-zinc-300">{text}</p>
    </div>
  );
}
