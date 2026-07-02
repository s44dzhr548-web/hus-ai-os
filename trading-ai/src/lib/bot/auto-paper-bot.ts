import type { AutoPaperBotStatus, BotActivityLog, BotLifecycleStatus } from "@/types/trading";
import { scanAllSignals } from "@/lib/ai/analysis-engine";
import { DEFAULT_WATCHLIST } from "@/lib/data/mock-market";
import { DEFAULT_RISK_SETTINGS, isRealTradingAllowed } from "@/lib/compliance/config";
import { executeGuardedPaperOrder } from "@/lib/paper/guarded-order";
import { getPaperPortfolio } from "@/lib/paper/portfolio";
import { getGuardianState, isEmergencyStopActive, setEmergencyStop, validatePaperTrade } from "@/lib/risk/guardian";
import { runGuardianProAssessment } from "@/lib/risk/guardian-pro";
import { unifiedQuote } from "@/lib/market/unified";
import { filterTradableSymbols, isSymbolTradableNow } from "@/lib/market/market-session";
import { logBotDecision } from "@/lib/audit/log";
import {
  acquireBotLock,
  appendBotActivity,
  BOT_MAX_CONSECUTIVE_ERRORS,
  BOT_MAX_TRADES_PER_DAY,
  BOT_SCHEDULE_MINUTES,
  computeNextRun,
  getStorageBackend,
  loadBotState,
  releaseBotLock,
  saveBotState,
  type PersistedBotTrade,
} from "./bot-store";

export { BOT_SCHEDULE_MINUTES, BOT_MAX_TRADES_PER_DAY };

function lifecycleStatus(state: Awaited<ReturnType<typeof loadBotState>>): BotLifecycleStatus {
  if (state.emergencyStop) return "stopped";
  if (!state.enabled) return "stopped";
  if (state.paused) return "paused";
  if (state.lastError && state.consecutiveErrors >= BOT_MAX_CONSECUTIVE_ERRORS) return "error";
  if (state.lastError) return "error";
  return "running";
}

async function log(entry: Omit<BotActivityLog, "id" | "at">) {
  const row = await appendBotActivity(entry);
  logBotDecision({
    action: entry.action,
    symbol: entry.symbol,
    success: entry.success,
    detailEn: entry.detailEn,
    detailAr: entry.detailAr,
  });
  return row;
}

async function syncEmergencyStopFromStore() {
  const state = await loadBotState();
  setEmergencyStop(state.emergencyStop);
}

export async function setBotEnabled(enabled: boolean) {
  await saveBotState({ enabled, paused: false, lastError: enabled ? undefined : undefined });
  if (!enabled) await saveBotState({ paused: false });
}

export async function startBot() {
  await saveBotState({
    enabled: true,
    paused: false,
    emergencyStop: false,
    lastError: undefined,
    consecutiveErrors: 0,
  });
  setEmergencyStop(false);
}

export async function stopBot() {
  await saveBotState({ enabled: false, paused: false });
}

export async function pauseBot() {
  const state = await loadBotState();
  if (!state.enabled) return;
  await saveBotState({ paused: true });
}

export async function resumeBot() {
  const state = await loadBotState();
  if (!state.enabled) {
    await startBot();
    return;
  }
  await saveBotState({ paused: false, lastError: undefined });
}

export async function setBotEmergencyStop(active: boolean) {
  await saveBotState({ emergencyStop: active, paused: active ? true : undefined });
  setEmergencyStop(active);
}

export async function getBotStatus(): Promise<AutoPaperBotStatus> {
  await syncEmergencyStopFromStore();
  const state = await loadBotState();
  const portfolio = await getPaperPortfolio();
  const settings = DEFAULT_RISK_SETTINGS;
  const guardian = getGuardianState(portfolio, settings);

  return {
    enabled: state.enabled,
    paused: state.paused,
    running: state.enabled && !state.paused && !state.emergencyStop,
    lifecycleStatus: lifecycleStatus(state),
    mode: "demo",
    scheduleMinutes: BOT_SCHEDULE_MINUTES,
    maxTradesPerDay: BOT_MAX_TRADES_PER_DAY,
    tradesToday: state.tradesToday,
    maxRiskPerTradePct: settings.riskPerTradePct,
    dailyLossLimitPct: settings.dailyLossLimitPct,
    emergencyStop: state.emergencyStop || isEmergencyStopActive(),
    lastRunAt: state.lastRunAt,
    nextRunAt: state.nextRunAt ?? computeNextRun(state.lastRunAt),
    lastScannedSymbols: state.lastScannedSymbols,
    lastTrade: state.lastTrade,
    lastError: state.lastError,
    consecutiveErrors: state.consecutiveErrors,
    openPositions: portfolio.openPositions.length,
    todayPnlPct: portfolio.totalPnlPct,
    activityLog: [...state.activityLog],
    guardian,
    storageBackend: getStorageBackend(),
    cronEnabled: Boolean(process.env.CRON_SECRET),
    paperOnly: !isRealTradingAllowed(),
  };
}

export type RunBotCycleOptions = {
  trigger?: "manual" | "cron" | "test";
  skipLock?: boolean;
};

export async function runBotCycle(opts: RunBotCycleOptions = {}): Promise<AutoPaperBotStatus> {
  const trigger = opts.trigger ?? "manual";

  if (trigger === "cron" && !opts.skipLock) {
    const locked = await acquireBotLock();
    if (!locked) {
      await log({
        action: "blocked",
        detailEn: "Skipped — another bot cycle is running",
        detailAr: "تم التخطي — دورة بوت أخرى قيد التشغيل",
        success: false,
      });
      return getBotStatus();
    }
  }

  try {
    await syncEmergencyStopFromStore();
    const state = await loadBotState();
    const lastRunAt = new Date().toISOString();
    await saveBotState({ lastRunAt, nextRunAt: computeNextRun(lastRunAt) });

    await log({
      action: "schedule",
      detailEn: `Scheduled scan started (${trigger})`,
      detailAr: `بدء المسح المجدول (${trigger})`,
      success: true,
    });

    if (!state.enabled) {
      await log({ action: "blocked", detailEn: "Bot stopped", detailAr: "البوت متوقف", success: false });
      return getBotStatus();
    }

    if (state.paused) {
      await log({ action: "blocked", detailEn: "Bot paused", detailAr: "البوت في وضع الإيقاف المؤقت", success: false });
      return getBotStatus();
    }

    if (state.emergencyStop || isEmergencyStopActive()) {
      await log({ action: "blocked", detailEn: "Emergency stop active", detailAr: "إيقاف الطوارئ نشط", success: false });
      return getBotStatus();
    }

    if (state.consecutiveErrors >= BOT_MAX_CONSECUTIVE_ERRORS) {
      await log({
        action: "blocked",
        detailEn: `Safety limit: ${BOT_MAX_CONSECUTIVE_ERRORS} consecutive errors`,
        detailAr: `حد الأمان: ${BOT_MAX_CONSECUTIVE_ERRORS} أخطاء متتالية`,
        success: false,
      });
      return getBotStatus();
    }

    let portfolio = await getPaperPortfolio();
    const settings = DEFAULT_RISK_SETTINGS;
    const guardian = getGuardianState(portfolio, settings);
    if (!guardian.canTrade) {
      await log({
        action: "blocked",
        detailEn: guardian.blockedReasons.join("; "),
        detailAr: guardian.blockedReasons.join("؛ "),
        success: false,
      });
      return getBotStatus();
    }

    let { tradesToday } = await loadBotState();
    if (tradesToday >= BOT_MAX_TRADES_PER_DAY) {
      await log({
        action: "blocked",
        detailEn: `Max trades per day (${BOT_MAX_TRADES_PER_DAY}) reached`,
        detailAr: `الحد الأقصى للصفقات اليومية (${BOT_MAX_TRADES_PER_DAY})`,
        success: false,
      });
      return getBotStatus();
    }

    for (const pos of portfolio.openPositions) {
      if (tradesToday >= BOT_MAX_TRADES_PER_DAY) break;
      if (pos.unrealizedPnlPct <= -settings.stopLossPct) {
        const pro = runGuardianProAssessment(pos.symbol, "sell", pos.quantity, portfolio, pos.currentPrice, settings);
        if (pro.allowed) {
          const result = await executeGuardedPaperOrder(pos.symbol, "sell", pos.quantity, { useGuardianPro: false });
          if (result.ok) {
            tradesToday++;
            await saveBotState({
              tradesToday,
              lastTrade: { symbol: pos.symbol, side: "sell", at: new Date().toISOString() },
            });
          }
          await log({
            action: "stop_loss",
            symbol: pos.symbol,
            detailEn: result.ok ? `Stop loss at ${pos.unrealizedPnlPct.toFixed(1)}%` : result.error ?? "Rejected",
            detailAr: result.ok ? `وقف خسارة ${pos.unrealizedPnlPct.toFixed(1)}%` : "مرفوض",
            success: result.ok,
          });
        }
      } else if (pos.unrealizedPnlPct >= settings.takeProfitPct) {
        const pro = runGuardianProAssessment(pos.symbol, "sell", pos.quantity, portfolio, pos.currentPrice, settings);
        if (pro.allowed) {
          const result = await executeGuardedPaperOrder(pos.symbol, "sell", pos.quantity, { useGuardianPro: false });
          if (result.ok) {
            tradesToday++;
            await saveBotState({
              tradesToday,
              lastTrade: { symbol: pos.symbol, side: "sell", at: new Date().toISOString() },
            });
          }
          await log({
            action: "take_profit",
            symbol: pos.symbol,
            detailEn: result.ok ? `Take profit at ${pos.unrealizedPnlPct.toFixed(1)}%` : result.error ?? "Rejected",
            detailAr: result.ok ? `جني ربح ${pos.unrealizedPnlPct.toFixed(1)}%` : "مرفوض",
            success: result.ok,
          });
        }
      }
    }

    portfolio = await getPaperPortfolio();
    const watchlist = DEFAULT_WATCHLIST.slice(0, 8);
    const { tradable, skipped } = filterTradableSymbols(watchlist);
    await saveBotState({ lastScannedSymbols: tradable });

    for (const skip of skipped) {
      await log({
        action: "blocked",
        symbol: skip.symbol,
        detailEn: skip.reason,
        detailAr: skip.reason,
        success: false,
      });
    }

    const signals = await scanAllSignals(tradable.length ? tradable : watchlist);
    await log({
      action: "scan",
      detailEn: `Scanned ${signals.length} symbols (${tradable.length} tradable now)`,
      detailAr: `مسح ${signals.length} رمز (${tradable.length} قابل للتداول)`,
      success: true,
    });

    let lastTrade: PersistedBotTrade | undefined = (await loadBotState()).lastTrade;

    for (const sig of signals) {
      if (tradesToday >= BOT_MAX_TRADES_PER_DAY) break;
      const marketCheck = isSymbolTradableNow(sig.symbol);
      if (!marketCheck.tradable) continue;

      portfolio = await getPaperPortfolio();
      if (portfolio.openPositions.length >= settings.maxOpenPositions) break;

      const quote = await unifiedQuote(sig.symbol);
      const maxCost = portfolio.equity * (settings.maxPositionPct / 100);
      const qty = Math.max(1, Math.floor(maxCost / quote.data.price));

      if (sig.recommendation === "buy" && sig.confidence >= 0.58) {
        const existing = portfolio.openPositions.find((p) => p.symbol === sig.symbol);
        if (existing) continue;

        const pro = runGuardianProAssessment(sig.symbol, "buy", qty, portfolio, quote.data.price, settings);
        if (!pro.allowed) {
          await log({
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
          await log({
            action: "blocked",
            symbol: sig.symbol,
            detailEn: check.reasons.join("; "),
            detailAr: check.reasons.join("؛ "),
            success: false,
          });
          continue;
        }

        const result = await executeGuardedPaperOrder(sig.symbol, "buy", qty, {
          aiRecommendation: sig.recommendation,
          useGuardianPro: false,
        });
        if (result.ok) {
          tradesToday++;
          lastTrade = { symbol: sig.symbol, side: "buy", at: new Date().toISOString() };
          await saveBotState({ tradesToday, lastTrade });
        }
        await log({
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
        const result = await executeGuardedPaperOrder(sig.symbol, "sell", pos.quantity, { useGuardianPro: false });
        if (result.ok) {
          tradesToday++;
          lastTrade = { symbol: sig.symbol, side: "sell", at: new Date().toISOString() };
          await saveBotState({ tradesToday, lastTrade });
        }
        await log({
          action: "sell",
          symbol: sig.symbol,
          detailEn: result.ok ? `Virtual SELL ${pos.quantity}` : result.error ?? "Rejected",
          detailAr: result.ok ? `بيع افتراضي ${pos.quantity}` : "مرفوض",
          success: result.ok,
        });
        portfolio = result.portfolio;
      }
    }

    await saveBotState({ consecutiveErrors: 0, lastError: undefined });
    return getBotStatus();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const state = await loadBotState();
    const consecutiveErrors = state.consecutiveErrors + 1;
    await saveBotState({ lastError: message, consecutiveErrors });
    await log({
      action: "blocked",
      detailEn: `Cycle error (retry ${consecutiveErrors}/${BOT_MAX_CONSECUTIVE_ERRORS}): ${message}`,
      detailAr: `خطأ في الدورة (إعادة ${consecutiveErrors}/${BOT_MAX_CONSECUTIVE_ERRORS}): ${message}`,
      success: false,
    });
    return getBotStatus();
  } finally {
    if (trigger === "cron" && !opts.skipLock) {
      await releaseBotLock();
    }
  }
}

export async function getBotActivityLog(): Promise<BotActivityLog[]> {
  const state = await loadBotState();
  return [...state.activityLog];
}

export { setEmergencyStop, isEmergencyStopActive };
