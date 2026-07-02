import type { AutoPaperBotStatus, BotActivityLog, Recommendation } from "@/types/trading";
import { scanAllSignals } from "@/lib/ai/analysis-engine";
import { DEFAULT_WATCHLIST } from "@/lib/data/mock-market";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { getPaperPortfolio, placePaperOrder } from "@/lib/paper/portfolio";
import { getGuardianState, validatePaperTrade } from "@/lib/risk/guardian";
import { unifiedQuote } from "@/lib/market/unified";

const SCHEDULE_MINUTES = 15;
let botEnabled = true;
let lastRunAt: string | undefined;
const activityLog: BotActivityLog[] = [];

function log(entry: Omit<BotActivityLog, "id" | "at">) {
  activityLog.unshift({ id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), ...entry });
  if (activityLog.length > 100) activityLog.pop();
}

export function setBotEnabled(enabled: boolean) {
  botEnabled = enabled;
}

export async function getBotStatus(): Promise<AutoPaperBotStatus> {
  const portfolio = await getPaperPortfolio();
  const guardian = getGuardianState(portfolio, DEFAULT_RISK_SETTINGS);
  const nextRun = lastRunAt
    ? new Date(new Date(lastRunAt).getTime() + SCHEDULE_MINUTES * 60000).toISOString()
    : new Date(Date.now() + SCHEDULE_MINUTES * 60000).toISOString();

  return {
    enabled: botEnabled,
    mode: "demo",
    scheduleMinutes: SCHEDULE_MINUTES,
    lastRunAt,
    nextRunAt: nextRun,
    openPositions: portfolio.openPositions.length,
    todayPnlPct: portfolio.totalPnlPct,
    activityLog: [...activityLog],
    guardian,
  };
}

export async function runBotCycle(): Promise<AutoPaperBotStatus> {
  lastRunAt = new Date().toISOString();
  log({ action: "schedule", detailEn: "Scheduled scan started", detailAr: "بدء المسح المجدول", success: true });

  if (!botEnabled) {
    log({ action: "blocked", detailEn: "Bot disabled", detailAr: "البوت معطل", success: false });
    return getBotStatus();
  }

  let portfolio = await getPaperPortfolio();
  const guardian = getGuardianState(portfolio, DEFAULT_RISK_SETTINGS);
  if (!guardian.canTrade) {
    log({
      action: "blocked",
      detailEn: guardian.blockedReasons.join("; "),
      detailAr: guardian.blockedReasons.join("؛ "),
      success: false,
    });
    return getBotStatus();
  }

  const settings = DEFAULT_RISK_SETTINGS;
  for (const pos of portfolio.openPositions) {
    if (pos.unrealizedPnlPct <= -settings.stopLossPct) {
      const check = validatePaperTrade(pos.symbol, "sell", pos.quantity, portfolio, pos.currentPrice, settings);
      if (check.allowed) {
        await placePaperOrder(pos.symbol, "sell", pos.quantity);
        log({
          action: "stop_loss",
          symbol: pos.symbol,
          detailEn: `Stop loss triggered at ${pos.unrealizedPnlPct.toFixed(1)}%`,
          detailAr: `وقف خسارة عند ${pos.unrealizedPnlPct.toFixed(1)}%`,
          success: true,
        });
      }
    } else if (pos.unrealizedPnlPct >= settings.takeProfitPct) {
      const check = validatePaperTrade(pos.symbol, "sell", pos.quantity, portfolio, pos.currentPrice, settings);
      if (check.allowed) {
        await placePaperOrder(pos.symbol, "sell", pos.quantity);
        log({
          action: "take_profit",
          symbol: pos.symbol,
          detailEn: `Take profit at ${pos.unrealizedPnlPct.toFixed(1)}%`,
          detailAr: `جني ربح عند ${pos.unrealizedPnlPct.toFixed(1)}%`,
          success: true,
        });
      }
    }
  }

  portfolio = await getPaperPortfolio();
  const signals = await scanAllSignals(DEFAULT_WATCHLIST.slice(0, 8));
  log({ action: "scan", detailEn: `Scanned ${signals.length} symbols`, detailAr: `مسح ${signals.length} رمز`, success: true });

  for (const sig of signals) {
    if (portfolio.openPositions.length >= settings.maxOpenPositions) break;
    const quote = await unifiedQuote(sig.symbol);
    const qty = Math.max(1, Math.floor((portfolio.equity * (settings.maxPositionPct / 100)) / quote.data.price));

    if (sig.recommendation === "buy" && sig.confidence >= 0.58) {
      const existing = portfolio.openPositions.find((p) => p.symbol === sig.symbol);
      if (existing) continue;
      const check = validatePaperTrade(sig.symbol, "buy", qty, portfolio, quote.data.price, settings);
      if (!check.allowed) {
        log({ action: "blocked", symbol: sig.symbol, detailEn: check.reasons.join("; "), detailAr: check.reasons.join("؛ "), success: false });
        continue;
      }
      const result = await placePaperOrder(sig.symbol, "buy", qty);
      log({
        action: "buy",
        symbol: sig.symbol,
        detailEn: result.ok ? `Virtual BUY ${qty} @ ${quote.data.price}` : result.error ?? "Rejected",
        detailAr: result.ok ? `شراء افتراضي ${qty} @ ${quote.data.price}` : "مرفوض",
        success: result.ok,
      });
      portfolio = result.portfolio;
    }

    if (sig.recommendation === "sell") {
      const pos = portfolio.openPositions.find((p) => p.symbol === sig.symbol);
      if (!pos) continue;
      const check = validatePaperTrade(sig.symbol, "sell", pos.quantity, portfolio, quote.data.price, settings);
      if (!check.allowed) continue;
      const result = await placePaperOrder(sig.symbol, "sell", pos.quantity);
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

  return getBotStatus();
}

export function getBotActivityLog(): BotActivityLog[] {
  return [...activityLog];
}
