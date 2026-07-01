"use client";

import { useEffect, useState } from "react";
import type { LearningRecord, LearningStats } from "@/types/trading";

export function LearningClient() {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [records, setRecords] = useState<LearningRecord[]>([]);

  useEffect(() => {
    fetch("/api/learning").then((r) => r.json()).then((d) => {
      setStats(d.stats);
      setRecords(d.records ?? []);
    });
  }, []);

  if (!stats) return <p className="text-zinc-500">Loading learning data…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs text-zinc-500">Total Predictions</p>
          <p className="text-2xl font-semibold">{stats.totalPredictions}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs text-zinc-500">Accuracy</p>
          <p className="text-2xl font-semibold">{stats.accuracy}%</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs text-zinc-500">Correct</p>
          <p className="text-2xl font-semibold">{stats.correct}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs text-zinc-500">Improvement Trend</p>
          <p className={`text-2xl font-semibold ${stats.improvementTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {stats.improvementTrend >= 0 ? "+" : ""}{stats.improvementTrend}%
          </p>
        </div>
      </div>

      {stats.recentMistakes.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h3 className="font-medium">Recent Mistakes (Learning Log)</h3>
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
        <h3 className="font-medium">Prediction History</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="p-2">Symbol</th>
                <th className="p-2">Rec</th>
                <th className="p-2">Predicted</th>
                <th className="p-2">Actual</th>
                <th className="p-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 10).map((r) => (
                <tr key={r.id} className="border-t border-zinc-800/50">
                  <td className="p-2">{r.symbol}</td>
                  <td className="p-2 uppercase">{r.recommendation}</td>
                  <td className="p-2">{r.predictedDirection}</td>
                  <td className="p-2">{r.actualDirection}</td>
                  <td className={`p-2 ${r.wasCorrect ? "text-emerald-400" : "text-red-400"}`}>
                    {r.resolvedAt ? (r.wasCorrect ? "✓" : "✗") : "pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
