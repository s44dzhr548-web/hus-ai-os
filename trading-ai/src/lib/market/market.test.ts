import { describe, expect, it } from "vitest";
import { getProviderHealth } from "@/lib/market/unified";
import { unifiedQuote, unifiedSearch } from "@/lib/market/unified";
import { getCached, setCached } from "@/lib/market/cache";
import { checkRateLimit } from "@/lib/market/rate-limit";

describe("market provider status", () => {
  it("returns provider health list", () => {
    const health = getProviderHealth();
    expect(health.length).toBeGreaterThan(5);
    expect(health.some((p) => p.id === "mock")).toBe(true);
  });

  it("demo fallback works when keys missing", async () => {
    const quote = await unifiedQuote("UNKNOWN_SYMBOL_XYZ");
    expect(quote.data.price).toBeGreaterThan(0);
    expect(quote.source).toBeDefined();
  });

  it("search returns catalog results", async () => {
    const results = await unifiedSearch("BTC", 5);
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("cache and rate limit", () => {
  it("caches values with ttl", () => {
    setCached("test-key", { ok: true }, 5000);
    expect(getCached<{ ok: boolean }>("test-key")?.ok).toBe(true);
  });

  it("rate limits excessive calls", () => {
    const key = "test-provider:fetch";
    for (let i = 0; i < 30; i++) checkRateLimit(key, 30);
    const blocked = checkRateLimit(key, 30);
    expect(blocked.allowed).toBe(false);
  });
});
