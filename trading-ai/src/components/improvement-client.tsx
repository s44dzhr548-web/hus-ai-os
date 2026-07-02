"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

type ImprovementState = {
  history: { id: string; category: string; mistakeEn: string; mistakeAr: string; suggestedRuleEn: string; suggestedRuleAr: string; backtestImprovementPct: number; accepted: boolean }[];
  pending: { id: string; category: string; mistakeEn: string; mistakeAr: string; suggestedRuleEn: string; suggestedRuleAr: string; backtestImprovementPct: number }[];
  summaryEn: string;
  summaryAr: string;
};

export function ImprovementClient() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<ImprovementState | null>(null);

  useEffect(() => {
    fetch("/api/improvement").then((r) => r.json()).then(setState);
  }, []);

  if (!state) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <p className="text-sm text-zinc-400">{locale === "ar" ? state.summaryAr : state.summaryEn}</p>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.improvement.accepted}</h3>
        <ul className="mt-3 space-y-3 text-sm">
          {state.history.filter((h) => h.accepted).map((h) => (
            <li key={h.id} className="rounded-lg bg-zinc-950/50 p-3">
              <p>{locale === "ar" ? h.mistakeAr : h.mistakeEn}</p>
              <p className="text-emerald-400">{locale === "ar" ? h.suggestedRuleAr : h.suggestedRuleEn}</p>
              <p className="text-xs text-zinc-500">+{h.backtestImprovementPct}%</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.improvement.pending}</h3>
        <ul className="mt-3 space-y-3 text-sm text-zinc-400">
          {state.pending.map((p) => (
            <li key={p.id}>{locale === "ar" ? p.mistakeAr : p.mistakeEn}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
