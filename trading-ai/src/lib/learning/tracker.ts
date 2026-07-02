import type { Alert } from "@/types/trading";
import { hashSymbol } from "@/lib/data/seed";

export {
  getAllMemoryRecords as getAllRecords,
  getLearningStats,
  recordMemoryFromAnalysis,
  resolvePendingRecords,
  getConfidenceAnalytics,
  simulatePortfolioFollowingAI,
} from "./memory";

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
