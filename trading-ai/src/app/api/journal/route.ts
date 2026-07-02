import { NextResponse } from "next/server";
import { addJournalEntry, getJournalEntries } from "@/lib/journal/store";
import type { JournalEntry, Recommendation } from "@/types/trading";

export async function GET() {
  return NextResponse.json({ entries: getJournalEntries() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const symbol = String(body.symbol ?? "").toUpperCase();
  const userDecision = body.userDecision as Recommendation | "no_action";
  const aiRecommendation = body.aiRecommendation as Recommendation;
  const userReason = String(body.userReason ?? body.userNotes ?? "");
  const userNotes = String(body.userNotes ?? "");
  const emotion = body.emotion as JournalEntry["emotion"] | undefined;
  const lessonsLearned = body.lessonsLearned ? String(body.lessonsLearned) : undefined;

  if (!symbol || !userDecision || !aiRecommendation) {
    return NextResponse.json({ error: "symbol, userDecision, aiRecommendation required" }, { status: 400 });
  }

  const entry = addJournalEntry({ symbol, userDecision, aiRecommendation, userReason, userNotes, emotion, lessonsLearned });
  return NextResponse.json({ entry });
}
