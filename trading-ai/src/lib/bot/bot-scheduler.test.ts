import { describe, expect, it, beforeEach } from "vitest";
import {
  getBotStatus,
  pauseBot,
  resumeBot,
  runBotCycle,
  startBot,
  stopBot,
} from "@/lib/bot/auto-paper-bot";
import { resetBotStateForTests } from "@/lib/bot/bot-store";
import { isRealTradingAllowed } from "@/lib/compliance/config";
import { getGuardianState, setEmergencyStop, validatePaperTrade } from "@/lib/risk/guardian";
import { getPaperPortfolio } from "@/lib/paper/portfolio";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { isSymbolTradableNow } from "@/lib/market/market-session";

describe("auto paper bot 24/7", () => {
  beforeEach(async () => {
    await resetBotStateForTests();
    setEmergencyStop(false);
    await startBot();
  });

  it("returns bot status in demo mode with 5m schedule", async () => {
    const status = await getBotStatus();
    expect(status.mode).toBe("demo");
    expect(status.paperOnly).toBe(true);
    expect(status.scheduleMinutes).toBe(5);
    expect(status.enabled).toBe(true);
  });

  it("runs 10 scheduled cycles in test mode (paper only)", async () => {
    expect(isRealTradingAllowed()).toBe(false);
    for (let i = 0; i < 10; i++) {
      const status = await runBotCycle({ trigger: "test", skipLock: true });
      expect(status.activityLog.length).toBeGreaterThan(0);
      expect(status.paperOnly).toBe(true);
    }
    const final = await getBotStatus();
    expect(final.lastRunAt).toBeTruthy();
    expect(final.lifecycleStatus).not.toBe("stopped");
  });

  it("pauses and resumes without stopping permanently", async () => {
    await pauseBot();
    let status = await getBotStatus();
    expect(status.paused).toBe(true);
    expect(status.lifecycleStatus).toBe("paused");

    const pausedRun = await runBotCycle({ trigger: "test", skipLock: true });
    expect(pausedRun.activityLog.some((l) => l.detailEn.toLowerCase().includes("pause"))).toBe(true);

    await resumeBot();
    status = await getBotStatus();
    expect(status.paused).toBe(false);
    expect(status.lifecycleStatus).toBe("running");
  });

  it("stop bot blocks cycles", async () => {
    await stopBot();
    const status = await runBotCycle({ trigger: "test", skipLock: true });
    expect(status.enabled).toBe(false);
    expect(status.activityLog.some((l) => l.detailEn.includes("stopped"))).toBe(true);
  });

  it("guardian blocks emergency stop", async () => {
    setEmergencyStop(true);
    const portfolio = await getPaperPortfolio();
    const g = getGuardianState(portfolio, DEFAULT_RISK_SETTINGS);
    expect(g.canTrade).toBe(false);
    setEmergencyStop(false);
  });

  it("validates paper trades through guardian", async () => {
    const portfolio = await getPaperPortfolio();
    const check = validatePaperTrade("AAPL", "buy", 1, portfolio, 100, DEFAULT_RISK_SETTINGS);
    expect(typeof check.allowed).toBe("boolean");
  });

  it("respects market hours for US stocks", () => {
    const check = isSymbolTradableNow("AAPL");
    expect(typeof check.tradable).toBe("boolean");
    expect(check.reason.length).toBeGreaterThan(0);
  });

  it("crypto is always tradable", () => {
    const check = isSymbolTradableNow("BTCUSD");
    expect(check.tradable).toBe(true);
  });
});
