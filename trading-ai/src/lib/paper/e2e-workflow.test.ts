import { describe, expect, it } from "vitest";
import { writePaperE2EReport, runPaperTradingE2E, E2E_ASSETS } from "./e2e-workflow";

describe("Paper trading E2E workflow", () => {
  it("runs full paper trading E2E and writes report", async () => {
    const { report, filePath } = await writePaperE2EReport();
    expect(filePath).toContain("PAPER_TRADING_TEST_REPORT.md");
    expect(report.liveQuotes.length).toBe(E2E_ASSETS.length);
    expect(report.compliance.realTradingAllowed).toBe(false);
    expect(report.compliance.paperOnly).toBe(true);
    expect(report.stressTest.attempted).toBe(100);
    expect(report.steps.length).toBeGreaterThan(20);
    const failed = report.steps.filter((s) => !s.ok);
    if (failed.length) {
      console.warn("E2E steps failed:", failed.map((f) => `${f.step}: ${f.detail}`).join("; "));
    }
    expect(report.steps.filter((s) => s.step.startsWith("Live quote")).every((s) => s.ok)).toBe(true);
    expect(report.steps.find((s) => s.step === "Journal logging")?.ok).toBe(true);
    expect(report.steps.find((s) => s.step === "Notifications")?.ok).toBe(true);
    expect(report.steps.find((s) => s.step === "Compliance lock")?.ok).toBe(true);
  }, 120_000);

  it("computes portfolio stats after trades", async () => {
    const report = await runPaperTradingE2E();
    expect(report.stats.totalOrders).toBeGreaterThan(0);
    expect(typeof report.stats.riskScore).toBe("number");
  }, 120_000);
});
