"use client";

import { useEffect, useState } from "react";
import type { JournalEntry, Recommendation } from "@/types/trading";
import { useI18n, useRecommendationLabel } from "@/lib/i18n/context";
import { RecommendationBadge } from "./trading-shell";

export function JournalClient() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [symbol, setSymbol] = useState("AAPL");
  const [userDecision, setUserDecision] = useState<Recommendation | "no_action">("buy");
  const [aiRecommendation, setAiRecommendation] = useState<Recommendation>("buy");
  const [userReason, setUserReason] = useState("");
  const [notes, setNotes] = useState("");
  const [emotion, setEmotion] = useState<JournalEntry["emotion"]>("neutral");
  const [lessonsLearned, setLessonsLearned] = useState("");

  function load() {
    fetch("/api/journal")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, userDecision, aiRecommendation, userReason, userNotes: notes, emotion, lessonsLearned }),
    });
    setUserReason("");
    setNotes("");
    setLessonsLearned("");
    load();
  }

  return (
    <div className="space-y-6 text-start">
      <form onSubmit={submit} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
        <h3 className="font-medium">{t.journal.addEntry}</h3>
        <div className="flex flex-wrap gap-2">
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm uppercase" placeholder={t.common.symbol} />
          <select value={userDecision} onChange={(e) => setUserDecision(e.target.value as Recommendation | "no_action")} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            <option value="buy">{t.recommendation.buy}</option>
            <option value="hold">{t.recommendation.hold}</option>
            <option value="sell">{t.recommendation.sell}</option>
            <option value="no_action">{t.journal.noAction}</option>
          </select>
          <select value={aiRecommendation} onChange={(e) => setAiRecommendation(e.target.value as Recommendation)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            <option value="buy">{t.recommendation.buy}</option>
            <option value="hold">{t.recommendation.hold}</option>
            <option value="sell">{t.recommendation.sell}</option>
          </select>
          <select value={emotion} onChange={(e) => setEmotion(e.target.value as JournalEntry["emotion"])} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            <option value="confident">{t.journal.emotionConfident}</option>
            <option value="fearful">{t.journal.emotionFearful}</option>
            <option value="greedy">{t.journal.emotionGreedy}</option>
            <option value="neutral">{t.journal.emotionNeutral}</option>
            <option value="uncertain">{t.journal.emotionUncertain}</option>
          </select>
        </div>
        <input value={userReason} onChange={(e) => setUserReason(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder={t.journal.reasonPlaceholder} />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" rows={2} placeholder={t.journal.notesPlaceholder} />
        <input value={lessonsLearned} onChange={(e) => setLessonsLearned(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder={t.journal.lessonsPlaceholder} />
        <button type="submit" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950">{t.journal.save}</button>
      </form>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="font-medium">{t.journal.history}</h3>
        <ul className="mt-4 space-y-3">
          {entries.map((entry) => (
            <JournalRow key={entry.id} entry={entry} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function JournalRow({ entry }: { entry: JournalEntry }) {
  const { t } = useI18n();
  const userLabel = useRecommendationLabel(entry.userDecision === "no_action" ? "hold" : entry.userDecision);
  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{entry.symbol}</span>
        <RecommendationBadge rec={entry.aiRecommendation} />
        {entry.followedAi ? <span className="text-emerald-400 text-xs">{t.journal.followedAi}</span> : <span className="text-amber-400 text-xs">{t.journal.disagreed}</span>}
      </div>
      <p className="mt-2 text-zinc-400">{t.journal.userDecision}: {entry.userDecision === "no_action" ? t.journal.noAction : userLabel}</p>
      {entry.userReason && <p className="mt-1 text-zinc-500">{t.journal.reason}: {entry.userReason}</p>}
      {entry.emotion && <p className="mt-1 text-zinc-500">{t.journal.emotion}: {entry.emotion}</p>}
      {entry.lessonsLearned && <p className="mt-1 text-emerald-400/80">{t.journal.lessons}: {entry.lessonsLearned}</p>}
      <p className="mt-1 text-zinc-600">{entry.userNotes}</p>
    </li>
  );
}
