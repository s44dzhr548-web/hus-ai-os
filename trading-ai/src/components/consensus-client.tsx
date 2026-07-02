"use client";

import { useState } from "react";
import type { MultiAgentConsensusResult } from "@/types/trading";
import { useI18n } from "@/lib/i18n/context";
import { RecommendationBadge } from "./trading-shell";

export function ConsensusClient() {
  const { t, locale } = useI18n();
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState<MultiAgentConsensusResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/consensus?symbol=${symbol}&lang=${locale}`);
    setData(await res.json());
    setLoading(false);
  }

  return (
    <div className="space-y-6 text-start">
      <div className="flex gap-2">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm uppercase" />
        <button type="button" onClick={load} disabled={loading} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-zinc-950">{loading ? t.common.loading : t.consensus.run}</button>
      </div>
      {data && (
        <>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-3xl font-semibold">{data.consensusScore}%</p>
            <p className="mt-2">{locale === "ar" ? data.decisionRationaleAr : data.decisionRationaleEn}</p>
            <div className="mt-3"><RecommendationBadge rec={data.finalDecision} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.agents.map((a) => (
              <div key={a.agentId} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm">
                <p className="font-medium">{locale === "ar" ? a.nameAr : a.nameEn}</p>
                <p className="mt-1"><RecommendationBadge rec={a.stance} /> · {(a.confidence * 100).toFixed(0)}%</p>
                <ul className="mt-2 list-disc ps-4 text-zinc-400">
                  {(locale === "ar" ? a.reasonsAr : a.reasonsEn).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            ))}
          </div>
          {data.conflicts.length > 0 && (
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h3 className="font-medium">{t.consensus.conflicts}</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {data.conflicts.map((c, i) => (
                  <li key={i}>{c.agentA} vs {c.agentB}: {locale === "ar" ? c.issueAr : c.issueEn}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
