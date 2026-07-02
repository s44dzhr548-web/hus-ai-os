import type { JournalEntry, Recommendation } from "@/types/trading";

const SEED: JournalEntry[] = [
  {
    id: "j-001",
    symbol: "AAPL",
    userDecision: "buy",
    aiRecommendation: "buy",
    userReason: "Aligned with AI bullish MACD",
    exitReason: "Take profit at resistance",
    userNotes: "Followed AI — aligned with my view",
    emotion: "confident",
    mistakeTags: [],
    lessonsLearned: "Trust volume confirmation",
    followedAi: true,
    outcome: "profit",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "j-002",
    symbol: "TSLA",
    userDecision: "hold",
    aiRecommendation: "sell",
    userReason: "Believed in earnings recovery",
    exitReason: "Still holding",
    userNotes: "Disagreed with AI — held position",
    emotion: "uncertain",
    mistakeTags: ["timing", "ignored-ai"],
    lessonsLearned: "Check earnings calendar before overriding AI",
    followedAi: false,
    outcome: "loss",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

let entries: JournalEntry[] = [...SEED];

export function getJournalEntries(): JournalEntry[] {
  return [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addJournalEntry(entry: {
  symbol: string;
  userDecision: Recommendation | "no_action";
  aiRecommendation: Recommendation;
  userReason: string;
  exitReason?: string;
  userNotes: string;
  emotion?: JournalEntry["emotion"];
  mistakeTags?: string[];
  lessonsLearned?: string;
}): JournalEntry {
  const row: JournalEntry = {
    id: `j-${Date.now()}`,
    ...entry,
    followedAi: entry.userDecision === entry.aiRecommendation,
    outcome: "pending",
    createdAt: new Date().toISOString(),
  };
  entries.unshift(row);
  if (entries.length > 100) entries = entries.slice(0, 100);
  return row;
}
