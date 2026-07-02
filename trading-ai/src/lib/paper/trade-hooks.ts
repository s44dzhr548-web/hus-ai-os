import type { PaperOrder, Recommendation } from "@/types/trading";
import { addJournalEntry } from "@/lib/journal/store";
import { createAlert } from "@/lib/learning/tracker";

export function onPaperTradeFilled(order: PaperOrder, aiRecommendation: Recommendation = "hold") {
  addJournalEntry({
    symbol: order.symbol,
    userDecision: order.side === "buy" ? "buy" : "sell",
    aiRecommendation,
    userReason: "Automatic paper trade (E2E / bot)",
    exitReason: order.side === "sell" ? "Paper exit" : undefined,
    userNotes: `Virtual ${order.side.toUpperCase()} ${order.quantity} @ ${order.price} — paper only`,
    emotion: "neutral",
    mistakeTags: [],
    lessonsLearned: "Paper execution logged automatically",
  });

  createAlert({
    channel: "dashboard",
    type: "portfolio",
    title: `Paper ${order.side.toUpperCase()} — ${order.symbol}`,
    message: `Virtual ${order.side} ${order.quantity} @ ${order.price.toFixed(2)} (no real broker)`,
    symbol: order.symbol,
    severity: "low",
    whatsappReady: true,
    emailReady: false,
  });
}
