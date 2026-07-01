import type { Alert, LearningRecord, LearningStats, Recommendation } from "@/types/trading";
import { hashSymbol } from "@/lib/data/seed";

const SEED_LEARNING: LearningRecord[] = [
  {
    id: "lr-001",
    symbol: "AAPL",
    recommendation: "buy",
    predictedDirection: "up",
    actualDirection: "up",
    confidence: 0.72,
    wasCorrect: true,
    recordedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "lr-002",
    symbol: "TSLA",
    recommendation: "sell",
    predictedDirection: "down",
    actualDirection: "up",
    confidence: 0.61,
    wasCorrect: false,
    mistake: "Overweighted short-term volatility; missed earnings catalyst",
    recordedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "lr-003",
    symbol: "BTCUSD",
    recommendation: "hold",
    predictedDirection: "flat",
    actualDirection: "flat",
    confidence: 0.58,
    wasCorrect: true,
    recordedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    resolvedAt: new Date(Date.now() - 43200000).toISOString(),
  },
];

let records: LearningRecord[] = [...SEED_LEARNING];

export function recordPrediction(
  symbol: string,
  recommendation: Recommendation,
  confidence: number,
  predictedDirection: "up" | "down" | "flat"
): LearningRecord {
  const record: LearningRecord = {
    id: `lr-${Date.now()}`,
    symbol,
    recommendation,
    predictedDirection,
    actualDirection: "flat",
    confidence,
    wasCorrect: false,
    recordedAt: new Date().toISOString(),
  };
  records.unshift(record);
  if (records.length > 100) records = records.slice(0, 100);
  return record;
}

export function resolvePrediction(id: string, actualDirection: "up" | "down" | "flat"): LearningRecord | null {
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const predicted = records[idx].predictedDirection;
  const wasCorrect = predicted === actualDirection;
  records[idx] = {
    ...records[idx],
    actualDirection,
    wasCorrect,
    resolvedAt: new Date().toISOString(),
    mistake: wasCorrect ? undefined : `Predicted ${predicted}, actual ${actualDirection}`,
  };
  return records[idx];
}

export function getLearningStats(): LearningStats {
  const resolved = records.filter((r) => r.resolvedAt);
  const correct = resolved.filter((r) => r.wasCorrect).length;
  const recent = resolved.slice(0, 5);
  const older = resolved.slice(5, 10);
  const recentAcc = recent.length ? recent.filter((r) => r.wasCorrect).length / recent.length : 0;
  const olderAcc = older.length ? older.filter((r) => r.wasCorrect).length / older.length : 0;

  return {
    totalPredictions: resolved.length,
    correct,
    accuracy: resolved.length ? Number(((correct / resolved.length) * 100).toFixed(1)) : 0,
    recentMistakes: records.filter((r) => r.mistake).slice(0, 5),
    improvementTrend: Number(((recentAcc - olderAcc) * 100).toFixed(1)),
  };
}

export function getAllRecords(): LearningRecord[] {
  return [...records];
}

const SEED_ALERTS: Alert[] = [
  {
    id: "alert-001",
    channel: "dashboard",
    type: "signal",
    title: "NVDA Buy Signal",
    message: "AI score 78/100 — bullish crossover detected",
    symbol: "NVDA",
    severity: "medium",
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    whatsappReady: true,
  },
  {
    id: "alert-002",
    channel: "dashboard",
    type: "risk",
    title: "Daily Loss Limit Warning",
    message: "Paper portfolio down 2.1% — approaching 3% daily limit",
    severity: "high",
    read: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    whatsappReady: true,
  },
  {
    id: "alert-003",
    channel: "email",
    type: "system",
    title: "Mock Data Mode Active",
    message: "Platform running on demo data. Connect API keys for live feeds.",
    severity: "low",
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    whatsappReady: false,
  },
];

let alerts: Alert[] = [...SEED_ALERTS];

export function getAlerts(): Alert[] {
  return [...alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createAlert(alert: Omit<Alert, "id" | "createdAt" | "read">): Alert {
  const a: Alert = {
    ...alert,
    id: `alert-${Date.now()}-${hashSymbol(alert.title) % 1000}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  alerts.unshift(a);
  return a;
}

export function markAlertRead(id: string): boolean {
  const idx = alerts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  alerts[idx].read = true;
  return true;
}

export function getWhatsAppPayload(alert: Alert) {
  return {
    to: process.env.WHATSAPP_RECIPIENT ?? "+0000000000",
    body: `[Trading AI] ${alert.title}: ${alert.message}`,
    ready: alert.whatsappReady && Boolean(process.env.WHATSAPP_API_KEY) === false,
    note: "WhatsApp delivery requires WHATSAPP_API_KEY — structure ready, send disabled in mock mode",
  };
}
