import { describe, expect, it } from "vitest";
import { resolveMarketCategoryFromQuery } from "@/lib/markets/assets-query";

function params(input: Record<string, string>) {
  return new URLSearchParams(input);
}

describe("assets query resolver", () => {
  it("maps market=saudi to saudi tab", () => {
    expect(resolveMarketCategoryFromQuery(params({ market: "saudi" }))).toBe("saudi");
  });

  it("maps market=usa to us tab", () => {
    expect(resolveMarketCategoryFromQuery(params({ market: "usa" }))).toBe("us");
  });

  it("maps category filters", () => {
    expect(resolveMarketCategoryFromQuery(params({ category: "crypto" }))).toBe("crypto");
    expect(resolveMarketCategoryFromQuery(params({ category: "forex" }))).toBe("forex");
    expect(resolveMarketCategoryFromQuery(params({ category: "commodities" }))).toBe("commodity");
    expect(resolveMarketCategoryFromQuery(params({ category: "gold" }))).toBe("gold");
    expect(resolveMarketCategoryFromQuery(params({ category: "oil" }))).toBe("oil");
    expect(resolveMarketCategoryFromQuery(params({ category: "etfs" }))).toBe("etf");
    expect(resolveMarketCategoryFromQuery(params({ category: "indices" }))).toBe("index");
  });

  it("defaults to all when no filters", () => {
    expect(resolveMarketCategoryFromQuery(new URLSearchParams())).toBe("all");
  });
});
