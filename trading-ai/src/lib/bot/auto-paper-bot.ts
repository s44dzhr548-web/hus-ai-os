import type { AutoPaperBotStatus, BotActivityLog } from "@/types/trading";
import { scanAllSignals } from "@/lib/ai/analysis-engine";
import { DEFAULT_WATCHLIST } from "@/lib/data/mock-market";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { getPaperPortfolio, placePaperOrder } from "@/lib/paper/portfolio";
import { getGuardianState, isEmergencyStopActive, setEmergencyStop, validatePaperTrade } from "@/lib/risk/guardian";
import { runGuardianProAssessment } from "@/lib/risk/guardian-pro";
import { unifiedQuote } from "@/lib/market/unified";
import { logBotDecision } from "@/lib/audit/log";

const SCHEDULE_MINUTES = 15;
const MAX_TRADES_PER_DAY = 5;

let botEnabled = true;
let botRunning = false;
let lastRunAt: string | undefined;
let tradesToday = 0;
let tradesDayKey = new Date().toISOString().slice(0, 10);
const activityLog: BotActivityLog[] = [];

function resetDailyTradesIfNeeded() {
  const key = new Date().toISOString().slice(0, 10);
  if (key !== tradesDayKey) {
    tradesDayKey = key;
    tradesToday = 0;
  }
}

function log(entry: Omit<BotActivityLog, "id" | "at">) {
  const row: BotActivityLog = {
    id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    ...entry,
  };
  activityLog.unshift(row);
  if (activityLog.length > 100) activityLog.pop();
  logBotDecision({
    action: entry.action,
    symbol: entry.symbol,
    success: entry.success,
    detailEn: entry.detailEn,
    detailAr: entry.detailAr,
  });
}

export function setBotEnabled(enabled: boolean) {
  botEnabled = enabled;
  if (!enabled) botRunning = false;
}

export function startBot() {
  botEnabled = true;
  botRunning = true;
  setEmergencyStop(false);
}

export function stopBot() {
  botEnabled = false;
  botRunning = false;
}

export async function getBotStatus(): Promise<AutoPaperBotStatus> {
  resetDailyTradesIfNeeded();
  const portfolio = await getPaperPortfolio();
  const settings = DEFAULT_RISK_SETTINGS;
  const guardian = getGuardianState(portfolio, settings);
  const nextRun = lastRunAt
    ? new Date(new Date(lastRunAt).getTime() + SCHEDULE_MINUTES * 60000).toISOString()
    : new Date(Date.now() + SCHEDULE_MINUTES * 60000).toISOString();

  return {
    enabled: botEnabled,
    running: botRunning && botEnabled,
    mode: "demo",
    scheduleMinutes: SCHEDULE_MINUTES,
    maxTradesPerDay: MAX_TRADES_PER_DAY,
    tradesToday,
    maxRiskPerTradePct: settings.riskPerTradePct,
    dailyLossLimitPct: settings.dailyLossLimitPct,
    emergencyStop: isEmergencyStopActive(),
    lastRunAt,
    nextRunAt: nextRun,
    openPositions: portfolio.openPositions.length,
    todayPnlPct: portfolio.totalPnlPct,
    activityLog: [...activityLog],
    guardian,
  };
}

export async function runBotCycle(): Promise<AutoPaperBotStatus> {
  resetDailyTradesIfNeeded();
  lastRunAt = new Date().toISOString();
  log({ action: "schedule", detailEn: "Scheduled scan started", detailAr: "بدء المسح المجدول", success: true });

  if (!botEnabled) {
    log({ action: "blocked", detailEn: "Bot disabled", detailAr: "البوت معطل", success: false });
    return getBotStatus();
  }

  if (isEmergencyStopActive()) {
    log({ action: "blocked", detailEn: "Emergency stop active", detailAr: "إيقاف الطوارئ نشط", success: false });
    return getBotStatus();
  }

  let portfolio = await getPaperPortfolio();
  const settings = DEFAULT_RISK_SETTINGS;
  const guardian = getGuardianState(portfolio, settings);
  if (!guardian.canTrade) {
    log({
      action: "blocked",
      detailEn: guardian.blockedReasons.join("; "),
      detailAr: guardian.blockedReasons.join("؛ "),
      success: false,
    });
    return getBotStatus();
  }

  if (tradesToday >= MAX_TRADES_PER_DAY) {
    log({
      action: "blocked",
      detailEn: `Max trades per day (${MAX_TRADES_PER_DAY}) reached`,
      detailAr: `الحد الأقصى للصفقات اليومية (${MAX_TRADES_PER_DAY})`,
      success: false,
    });
    return getBotStatus();
  }

  for (const pos of portfolio.openPositions) {
    if (pos.unrealizedPnlPct <= -settings.stopLossPct) {
      const pro = runGuardianProAssessment(pos.symbol, "sell", pos.quantity, portfolio, pos.currentPrice, settings);
      if (pro.allowed) {
        await placePaperOrder(pos.symbol, "sell", pos.quantity);
        tradesToday++;
        log({
          action: "stop_loss",
          symbol: pos.symbol,
          detailEn: `Stop loss at ${pos.unrealizedPnlPct.toFixed(1)}%`,
          detailAr: `وقف خسارة ${pos.unrealizedPnlPct.toFixed(1)}%`,
          success: true,
        });
      }
    } else if (pos.unrealizedPnlPct >= settings.takeProfitPct) {
      const pro = runGuardianProAssessment(pos.symbol, "sell", pos.quantity, portfolio, pos.currentPrice, settings);
      if (pro.allowed) {
        await placePaperOrder(pos.symbol, "sell", pos.quantity);
        tradesToday++;
        log({
          action: "take_profit",
          symbol: pos.symbol,
          detailEn: `Take profit at ${pos.unrealizedPnlPct.toFixed(1)}%`,
          detailAr: `جني ربح ${pos.unrealizedPnlPct.toFixed(1)}%`,
          success: true,
        });
      }
    }
  }

  portfolio = await getPaperPortfolio();
  const signals = await scanAllSignals(DEFAULT_WATCHLIST.slice(0, 8));
  log({ action: "scan", detailEn: `Scanned ${signals.length} symbols`, detailAr: `مسح ${signals.length} رمز`, success: true });

  for (const sig of signals) {
    if (tradesToday >= MAX_TRADES_PER_DAY) break;
    if (portfolio.openPositions.length >= settings.maxOpenPositions) break;
    const quote = await unifiedQuote(sig.symbol);
    const qty = Math.max(1, Math.floor((portfolio.equity * (settings.maxPositionPct / 100)) / quote.data.price));

    if (sig.recommendation === "buy" && sig.confidence >= 0.58) {
      const existing = portfolio.openPositions.find((p) => p.symbol === sig.symbol);
      if (existing) continue;
      const pro = runGuardianProAssessment(sig.symbol, "buy", qty, portfolio, quote.data.price, settings);
      if (!pro.allowed) {
        log({
          action: "blocked",
          symbol: sig.symbol,
          detailEn: pro.summaryEn,
          detailAr: pro.summaryAr,
          success: false,
        });
        continue;
      }
      const check = validatePaperTrade(sig.symbol, "buy", qty, portfolio, quote.data.price, settings);
      if (!check.allowed) {
        log({ action: "blocked", symbol: sig.symbol, detailEn: check.reasons.join("; "), detailAr: check.reasons.join("؛ "), success: false });
        continue;
      }
      const result = await placePaperOrder(sig.symbol, "buy", qty);
      if (result.ok) tradesToday++;
      log({
        action: "buy",
        symbol: sig.symbol,
        detailEn: result.ok ? `Virtual BUY ${qty} @ ${quote.data.price}` : result.error ?? "Rejected",
        detailAr: result.ok ? `شراء افتراضي ${qty}` : "مرفوض",
        success: result.ok,
      });
      portfolio = result.portfolio;
    }

    if (sig.recommendation === "sell") {
      const pos = portfolio.openPositions.find((p) => p.symbol === sig.symbol);
      if (!pos) continue;
      const pro = runGuardianProAssessment(sig.symbol, "sell", pos.quantity, portfolio, quote.data.price, settings);
      if (!pro.allowed) continue;
      const result = await placePaperOrder(sig.symbol, "sell", pos.quantity);
      if (result.ok) tradesToday++;
      log({
        action: "sell",
        symbol: sig.symbol,
        detailEn: result.ok ? `Virtual SELL ${pos.quantity}` : result.error ?? "Rejected",
        detailAr: result.ok ? `بيع افتراضي ${pos.quantity}` : "مرفوض",
        success: result.ok,
      });
      portfolio = result.portfolio;
    }
  }

  botRunning = true;
  return getBotStatus();
}

export function getBotActivityLog(): BotActivityLog[] {
  return [...activityLog];
}

export { setEmergencyStop, isEmergencyStopActive };
