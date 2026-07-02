import { describe, expect, it } from "vitest";
import {
  ASSET_UNIVERSE,
  UNIVERSE_STATS,
  getAllActiveSymbols,
  getAssetBySymbol,
  getAssetsByMarketTab,
  matchesUniverseSearch,
  normalizeUniverseSymbol,
} from "@/lib/markets/asset-universe";

describe("asset universe", () => {
  it("loads full active symbol list without search", () => {
    expect(getAllActiveSymbols().length).toBeGreaterThanOrEqual(75);
    expect(UNIVERSE_STATS.total).toBe(ASSET_UNIVERSE.length);
  });

  it("includes required Saudi listed companies", () => {
    const required = ["2222", "1120", "1180", "2010", "7010", "1211", "2020", "2082"];
    for (const code of required) {
      const asset = getAssetBySymbol(code);
      expect(asset, `missing ${code}`).toBeDefined();
      expect(asset?.displaySymbol).toBe(`${code}.SR`);
      expect(asset?.exchange).toBe("Tadawul");
    }
    expect(getAssetsByMarketTab("saudi").length).toBeGreaterThanOrEqual(8);
  });

  it("normalizes .SR display symbols to internal quote symbols", () => {
    expect(normalizeUniverseSymbol("2222.SR")).toBe("2222");
    expect(getAssetBySymbol("2222.SR")?.name).toMatch(/Aramco/i);
  });

  it("populates US tab with NYSE/NASDAQ/AMEX stocks", () => {
    const us = getAssetsByMarketTab("us");
    expect(us.length).toBeGreaterThanOrEqual(15);
    expect(us.every((a) => a.category === "us_stock")).toBe(true);
    expect(us.some((a) => a.symbol === "AAPL")).toBe(true);
  });

  it("populates each market tab automatically", () => {
    expect(getAssetsByMarketTab("crypto").length).toBeGreaterThanOrEqual(5);
    expect(getAssetsByMarketTab("forex").length).toBeGreaterThanOrEqual(5);
    expect(getAssetsByMarketTab("etf").length).toBeGreaterThanOrEqual(8);
    expect(getAssetsByMarketTab("index").length).toBeGreaterThanOrEqual(4);
    expect(getAssetsByMarketTab("gold").length).toBeGreaterThanOrEqual(2);
    expect(getAssetsByMarketTab("oil").length).toBeGreaterThanOrEqual(3);
    expect(getAssetsByMarketTab("commodity").length).toBeGreaterThanOrEqual(5);
    expect(getAssetsByMarketTab("global").length).toBeGreaterThanOrEqual(5);
  });

  it("search is optional and filters visible assets", () => {
    const saudi = getAssetsByMarketTab("saudi", "rajhi");
    expect(saudi.length).toBe(1);
    expect(saudi[0]?.symbol).toBe("1120");
    expect(matchesUniverseSearch(getAssetBySymbol("1120")!, "")).toBe(true);
  });

  it("each record has required metadata fields", () => {
    for (const a of ASSET_UNIVERSE) {
      expect(a.id).toBeTruthy();
      expect(a.symbol).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(a.market).toBeTruthy();
      expect(a.exchange).toBeTruthy();
      expect(a.sector).toBeTruthy();
      expect(a.industry).toBeTruthy();
      expect(a.country).toBeTruthy();
      expect(a.currency).toBeTruthy();
      expect(a.provider).toBeTruthy();
      expect(typeof a.isActive).toBe("boolean");
    }
  });
});
