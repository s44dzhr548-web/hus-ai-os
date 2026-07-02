import { describe, expect, it } from "vitest";
import { resolveProfileSymbol, profilePathForSymbol } from "@/lib/intelligence/symbol-resolver";
import { buildFinancials, buildOverview, getCompanyIntelligenceProfile } from "@/lib/intelligence/company-profile";

describe("company intelligence profile", () => {
  it("resolves profile URL symbols", () => {
    expect(resolveProfileSymbol("2222.SR")).toBe("2222");
    expect(resolveProfileSymbol("AAPL")).toBe("AAPL");
    expect(resolveProfileSymbol("BTC-USD")).toBe("BTCUSD");
    expect(profilePathForSymbol("2222", "2222.SR")).toBe("/dashboard/markets/2222.SR");
  });

  it("builds overview for Aramco", () => {
    const overview = buildOverview("2222");
    expect(overview.name).toMatch(/Aramco/i);
    expect(overview.exchange).toBe("Tadawul");
    expect(overview.logo.initials.length).toBeGreaterThan(0);
  });

  it("builds seeded financials for US stock", () => {
    const fin = buildFinancials("AAPL");
    expect(fin.revenue).toBeDefined();
    expect(fin.eps).toBeDefined();
    expect(fin.dataSource).toBeDefined();
  });

  it("returns full intelligence profile for Apple", async () => {
    const profile = await getCompanyIntelligenceProfile("AAPL", "en");
    expect(profile).toBeTruthy();
    expect(profile!.overview.symbol).toBe("AAPL");
    expect(profile!.quote.price).toBeGreaterThan(0);
    expect(profile!.ai.recommendation).toMatch(/buy|hold|sell/);
    expect(profile!.news.length).toBeGreaterThan(0);
    expect(profile!.providers.length).toBeGreaterThan(5);
    expect(profile!.executionMode).toBe("paper_only");
    expect(profile!.brokerEnabled).toBe(false);
  }, 120000);

  it("returns profile for BTCUSD", async () => {
    const profile = await getCompanyIntelligenceProfile("BTCUSD", "en");
    expect(profile?.overview.assetClass).toBe("crypto");
  }, 120000);
});
