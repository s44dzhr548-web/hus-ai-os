import { describe, expect, it } from "vitest";
import { managedQuote } from "@/lib/market/provider-manager/manager";
import { validateQuotePrices } from "@/lib/market/provider-manager/validation";
import { getCostDashboard, trackApiCall } from "@/lib/market/provider-manager/cost";
import { chainForAssetClass } from "@/lib/market/provider-manager/chains";
import { getEnterpriseLogStats } from "@/lib/market/provider-manager/logging";
import { tieredGet, tieredSet } from "@/lib/market/cache-enterprise";
import { buildAIQualityScore } from "@/lib/intelligence/quality-score";

describe("enterprise provider manager", () => {
  it("returns quote with data status", async () => {
    const result = await managedQuote("AAPL");
    expect(result.data.price).toBeGreaterThan(0);
    expect(result.dataStatus).toBeDefined();
    expect(result.activeProvider).toBeDefined();
  });

  it("has failover chains per asset class", () => {
    const saudi = chainForAssetClass("saudi");
    expect(saudi.length).toBeGreaterThanOrEqual(3);
    const us = chainForAssetClass("stock");
    expect(us.some((e) => e.id === "polygon")).toBe(true);
  });

  it("validates price divergence", () => {
    const r = validateQuotePrices(
      [
        { source: "a", quote: { price: 100 } as never },
        { source: "b", quote: { price: 105 } as never },
      ],
      2
    );
    expect(r.valid).toBe(false);
    expect(r.confidenceAdjustment).toBeLessThan(0);
  });

  it("tracks API cost", () => {
    trackApiCall("polygon", 0.0002, 5000);
    const dash = getCostDashboard();
    expect(dash.totalApiCalls).toBeGreaterThan(0);
  });

  it("tiered cache stores values", async () => {
    await tieredSet("test:key", { v: 1 }, 5000);
    const hit = await tieredGet<{ v: number }>("test:key");
    expect(hit.hit).toBe(true);
    expect(hit.value?.v).toBe(1);
  });

  it("builds AI quality score", () => {
    const q = buildAIQualityScore({
      confidence: 0.7,
      signalScore: 72,
      newsSentiment: 0.2,
      sectorImpact: 0.3,
      oilImpact: 0.1,
      ratesImpact: -0.1,
      riskLevel: "medium",
      volatility: 0.3,
      quoteResult: { providerCount: 2, dataStatus: "live", isDemoData: false },
    });
    expect(q.confidence).toBeGreaterThan(0);
    expect(q.technicalScore).toBe(72);
  });

  it("enterprise logging accumulates stats", () => {
    const stats = getEnterpriseLogStats();
    expect(stats.total).toBeGreaterThanOrEqual(0);
  });
});
