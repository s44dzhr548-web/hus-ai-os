import { NextResponse } from "next/server";
import { addJournalEntry } from "@/lib/journal/store";
import type { JournalEntry, Recommendation } from "@/types/trading";

export async function POST(request: Request) {
  const body = await request.json();
  const symbol = String(body.symbol ?? "").toUpperCase();
  const userDecision = body.userDecision as Recommendation | "no_action";
  const aiRecommendation = body.aiRecommendation as Recommendation;
  const userReason = String(body.userReason ?? body.userNotes ?? body.note ?? "");
  const userNotes = String(body.userNotes ?? body.note ?? "");

  if (!symbol || !userDecision || !aiRecommendation) {
    return NextResponse.json({ error: "symbol, userDecision, aiRecommendation required" }, { status: 400 });
  }

  const entry = addJournalEntry({
    symbol,
    userDecision,
    aiRecommendation,
    userReason,
    userNotes,
    emotion: body.emotion as JournalEntry["emotion"] | undefined,
    mistakeTags: Array.isArray(body.mistakeTags) ? body.mistakeTags.map(String) : undefined,
    lessonsLearned: body.lessonsLearned ? String(body.lessonsLearned) : undefined,
  });

  return NextResponse.json({ ok: true, entry, executionMode: "paper_only" });
}
