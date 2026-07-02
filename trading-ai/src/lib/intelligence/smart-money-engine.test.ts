import { describe, expect, it } from "vitest";
import {
  buildAssetFlowProfile,
  buildSmartMoneySnapshot,
  getSmartMoneyOpportunitiesByCategory,
} from "@/lib/intelligence/smart-money-engine";

describe("smart money flow engine", () => {
  it("builds snapshot with asset flows and sectors", async () => {
    const snapshot = await buildSmartMoneySnapshot();
    expect(snapshot.assetFlows.length).toBeGreaterThanOrEqual(8);
    expect(snapshot.sectorInflows.length).toBeGreaterThan(0);
    expect(snapshot.opportunities.length).toBeGreaterThan(0);
    expect(snapshot.executionMode).toBe("paper_only");
    expect(snapshot.brokerEnabled).toBe(false);
  }, 120000);

  it("scores opportunities with weighted breakdown", async () => {
    const snapshot = await buildSmartMoneySnapshot();
    const top = snapshot.opportunities[0];
    expect(top?.score).toBeGreaterThan(0);
    expect(top?.score).toBeLessThanOrEqual(100);
    expect(top?.grade).toMatch(/A\+|A|B|C|Avoid/);
    expect(top?.breakdown.moneyFlow).toBeDefined();
    expect(top?.breakdown.technical).toBeDefined();
    expect(top?.breakdown.riskManagement).toBeDefined();
    expect(top?.confidence).toBeGreaterThan(0);
    expect(top?.expectedReturnPct).toBeDefined();
    expect(top?.timeHorizon).toMatch(/short|medium|long/);
  }, 120000);

  it("provides sector rotations", async () => {
    const snapshot = await buildSmartMoneySnapshot();
    expect(snapshot.rotations.length).toBeGreaterThan(0);
    expect(snapshot.rotations[0]?.watchSymbols.length).toBeGreaterThan(0);
  }, 120000);

  it("filters opportunities by category", async () => {
    const snapshot = await buildSmartMoneySnapshot();
    expect(getSmartMoneyOpportunitiesByCategory("saudi", snapshot).length).toBeGreaterThan(0);
    expect(getSmartMoneyOpportunitiesByCategory("crypto", snapshot).length).toBeGreaterThan(0);
  }, 120000);

  it("builds asset flow profile for Aramco", async () => {
    const flow = await buildAssetFlowProfile("2222");
    expect(flow?.symbol).toBe("2222");
    expect(flow?.opportunityScore).toBeGreaterThan(0);
    expect(flow?.grade).toMatch(/A\+|A|B|C|Avoid/);
    expect(flow?.breakdown.riskManagement).toBeDefined();
    expect(flow?.explanationEn.whyMoving.length).toBeGreaterThan(0);
  }, 120000);
});
