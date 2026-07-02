import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/markets/assets/route";

function req(query: string) {
  return new Request(`http://localhost/api/markets/assets${query}`);
}

describe("GET /api/markets/assets", () => {
  it("returns all seeded assets metadata without ranked scoring", async () => {
    const res = await GET(req("?ranked=0"));
    const data = await res.json();
    expect(data.total).toBeGreaterThanOrEqual(95);
    expect(data.assets[0]?.symbol).toBeTruthy();
    expect(data.assets[0]?.market).toBeTruthy();
    expect(data.assets[0]?.isActive).toBe(true);
  });

  it("filters saudi market via market=saudi", async () => {
    const res = await GET(req("?market=saudi&ranked=0"));
    const data = await res.json();
    expect(data.category).toBe("saudi");
    expect(data.total).toBeGreaterThanOrEqual(20);
    expect(data.assets.every((a: { country: string }) => a.country === "SA")).toBe(true);
  });

  it("filters usa market via market=usa", async () => {
    const res = await GET(req("?market=usa&ranked=0"));
    const data = await res.json();
    expect(data.category).toBe("us");
    expect(data.total).toBeGreaterThanOrEqual(20);
  });

  it("filters crypto category with AI ranking fields", async () => {
    const res = await GET(req("?category=crypto&pageSize=5"));
    const data = await res.json();
    expect(data.category).toBe("crypto");
    expect(data.total).toBeGreaterThanOrEqual(10);
    const first = data.assets[0];
    expect(first?.aiOpportunityScore).toBeDefined();
    expect(first?.expectedReturn).toBeDefined();
    expect(first?.riskScore).toBeDefined();
    expect(first?.confidence).toBeDefined();
    expect(first?.recommendation).toMatch(/buy|hold|sell/i);
    expect(first?.reason?.length).toBeGreaterThan(0);
    expect(["live", "demo", "cached", "seeded"]).toContain(first?.dataSource);
  }, 120000);

  it("filters forex, commodities, gold, oil, etfs, indices", async () => {
    const checks: Array<[string, number]> = [
      ["forex", 10],
      ["commodities", 10],
      ["gold", 2],
      ["oil", 3],
      ["etfs", 10],
      ["indices", 10],
    ];
    for (const [category, min] of checks) {
      const res = await GET(req(`?category=${category}&ranked=0`));
      const data = await res.json();
      expect(data.total, category).toBeGreaterThanOrEqual(min);
    }
  });
});
