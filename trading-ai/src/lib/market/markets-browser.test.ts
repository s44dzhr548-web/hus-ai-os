import { describe, expect, it } from "vitest";
import {
  MARKET_CATEGORIES,
  MARKET_SORT_OPTIONS,
  browseMarkets,
  getAllCatalogSymbols,
  matchesCategory,
  matchesSearch,
  sortMarketItems,
} from "./markets-browser";

describe("markets browser filters", () => {
  it("includes all catalog symbols by default", () => {
    expect(getAllCatalogSymbols().length).toBeGreaterThanOrEqual(95);
  });

  it("filters US stocks to NYSE/NASDAQ/AMEX", () => {
    expect(matchesCategory("AAPL", "us")).toBe(true);
    expect(matchesCategory("BP", "us")).toBe(false);
    expect(matchesCategory("JPM", "us")).toBe(true);
  });

  it("filters Saudi to Tadawul symbols", () => {
    expect(matchesCategory("2222", "saudi")).toBe(true);
    expect(matchesCategory("AAPL", "saudi")).toBe(false);
  });

  it("filters global stocks by region", () => {
    expect(matchesCategory("BP", "global")).toBe(true);
    expect(matchesCategory("SAP", "global")).toBe(true);
    expect(matchesCategory("AAPL", "global")).toBe(false);
  });

  it("filters gold instruments only", () => {
    expect(matchesCategory("GCUSD", "gold")).toBe(true);
    expect(matchesCategory("GLD", "gold")).toBe(true);
    expect(matchesCategory("SIUSD", "gold")).toBe(false);
  });

  it("filters oil instruments", () => {
    expect(matchesCategory("CLUSD", "oil")).toBe(true);
    expect(matchesCategory("USO", "oil")).toBe(true);
    expect(matchesCategory("GCUSD", "oil")).toBe(false);
  });

  it("filters crypto only", () => {
    expect(matchesCategory("BTCUSD", "crypto")).toBe(true);
    expect(matchesCategory("AAPL", "crypto")).toBe(false);
  });

  it("search is optional and filters within category", () => {
    expect(matchesSearch("AAPL", "")).toBe(true);
    expect(matchesSearch("AAPL", "apple")).toBe(true);
    expect(matchesSearch("AAPL", "ZZZ")).toBe(false);
  });

  it("all category filter keys are valid", () => {
    for (const c of MARKET_CATEGORIES) {
      expect(typeof c).toBe("string");
    }
    for (const s of MARKET_SORT_OPTIONS) {
      expect(typeof s).toBe("string");
    }
  });

  it("sorts by AI opportunity by default", () => {
    const items = sortMarketItems(
      [
        { rank: 0, symbol: "A", aiOpportunityScore: 10, expectedReturnPct: 5, riskScore: 50, aiConfidence: 0.5, changePct: 1, volume: 100, signalScore: 50 } as never,
        { rank: 0, symbol: "B", aiOpportunityScore: 90, expectedReturnPct: 5, riskScore: 50, aiConfidence: 0.5, changePct: 1, volume: 100, signalScore: 50 } as never,
      ],
      "ai_opportunity"
    );
    expect(items[0]?.symbol).toBe("B");
    expect(items[0]?.rank).toBe(1);
  });

  it("browseMarkets returns paginated results without search", async () => {
    const result = await browseMarkets({ category: "all", sort: "ai_opportunity", page: 1, pageSize: 6 });
    expect(result.items.length).toBeLessThanOrEqual(6);
    expect(result.total).toBeGreaterThan(0);
    expect(result.items[0]?.rank).toBe(1);
    expect(result.items[0]?.recommendation).toBeDefined();
    expect(result.items[0]?.whySelected.length).toBeGreaterThan(0);
  }, 120000);

  it("browseMarkets filters category crypto", async () => {
    const result = await browseMarkets({ category: "crypto", page: 1, pageSize: 20 });
    expect(result.items.every((i) => i.category === "crypto")).toBe(true);
  }, 120000);
});
