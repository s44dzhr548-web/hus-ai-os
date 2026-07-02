import { describe, expect, it } from "vitest";
import { GET as flowGet } from "@/app/api/smart-money/flow/route";
import { GET as oppGet } from "@/app/api/smart-money/opportunities/route";
import { GET as assetGet } from "@/app/api/smart-money/asset/[symbol]/route";

describe("smart money API routes", () => {
  it("GET /api/smart-money/flow", async () => {
    const res = await flowGet();
    const data = await res.json();
    expect(data.flow.assetFlows.length).toBeGreaterThan(0);
    expect(data.brokerEnabled).toBe(false);
  }, 120000);

  it("GET /api/smart-money/opportunities", async () => {
    const res = await oppGet(new Request("http://localhost/api/smart-money/opportunities?category=best_inflow&grades=all"));
    const data = await res.json();
    expect(data.opportunities.length).toBeGreaterThan(0);
    expect(data.scoreWeights.moneyFlow).toBe(0.25);
    expect(data.scoreWeights.riskManagement).toBe(0.1);
    expect(data.gradeScale["A+"]).toBe("90–100");
    expect(data.opportunities[0]?.grade).toMatch(/A\+|A|B|C|Avoid/);
    expect(data.opportunities[0]?.breakdown.riskManagement).toBeDefined();
  }, 120000);

  it("GET /api/smart-money/opportunities premium filter", async () => {
    const all = await oppGet(new Request("http://localhost/api/smart-money/opportunities?category=best_inflow&grades=all"));
    const premium = await oppGet(new Request("http://localhost/api/smart-money/opportunities?category=best_inflow&grades=premium"));
    const allData = await all.json();
    const premiumData = await premium.json();
    expect(premiumData.opportunities.length).toBeLessThanOrEqual(allData.opportunities.length);
    for (const item of premiumData.opportunities) {
      expect(["A+", "A"]).toContain(item.grade);
    }
  }, 120000);

  it("GET /api/smart-money/asset/AAPL", async () => {
    const res = await assetGet(new Request("http://localhost"), { params: Promise.resolve({ symbol: "AAPL" }) });
    const data = await res.json();
    expect(data.flow.symbol).toBe("AAPL");
  }, 120000);
});
