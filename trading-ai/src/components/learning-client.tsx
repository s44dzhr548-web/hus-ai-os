"use client";

import { useEffect, useState } from "react";
import type { LearningRecord, LearningStats } from "@/types/trading";
import { useI18n, useRecommendationLabel } from "@/lib/i18n/context";

export function LearningClient() {
  const { t } = useI18n();
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [records, setRecords] = useState<LearningRecord[]>([]);

  useEffect(() => {
    fetch("/api/learning")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setRecords(d.records ?? []);
      });
  }, []);

  if (!stats) return <p className="text-zinc-500">{t.common.loading}</p>;

  return (
    <div className="space-y-6 text-start">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label={t.learning.totalPredictions} value={String(stats.totalPredictions)} />
        <Stat label={t.learning.accuracy} value={`${stats.accuracy}%`} />
        <Stat label={t.learning.correct} value={String(stats.correct)} />
        <Stat
          label={t.learning.improvement}
          value={`${stats.improvementTrend >= 0 ? "+" : ""}${stats.improvementTrend}%`}
          positive={stats.improvementTrend >= 0}
        />
      </div>

      {stats.recentMistakes.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">{t.learning.recentMistakes}</h3>
          <ul className="mt-3 space-y-3">
            {stats.recentMistakes.map((m) => (
              <li key={m.id} className="rounded-lg bg-zinc-950/50 p-3 text-sm">
                <span className="font-medium">{m.symbol}</span> — {m.mistake}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.learning.history}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="p-2 text-start">{t.common.symbol}</th>
                <th className="p-2 text-start">{t.learning.rec}</th>
                <th className="p-2 text-start">{t.learning.predicted}</th>
                <th className="p-2 text-start">{t.learning.actual}</th>
                <th className="p-2 text-start">{t.learning.result}</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 10).map((r) => (
                <RecordRow key={r.id} record={r} pendingLabel={t.learning.pending} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-2xl font-semibold ${positive === false ? "text-red-400" : positive ? "text-emerald-400" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function RecordRow({ record, pendingLabel }: { record: LearningRecord; pendingLabel: string }) {
  const recLabel = useRecommendationLabel(record.recommendation);
  return (
    <tr className="border-t border-zinc-800/50">
      <td className="p-2">{record.symbol}</td>
      <td className="p-2">{recLabel}</td>
      <td className="p-2">{record.predictedDirection}</td>
      <td className="p-2">{record.actualDirection}</td>
      <td className={`p-2 ${record.wasCorrect ? "text-emerald-400" : record.resolvedAt ? "text-red-400" : ""}`}>
        {record.resolvedAt ? (record.wasCorrect ? "✓" : "✗") : pendingLabel}
      </td>
    </tr>
  );
}
