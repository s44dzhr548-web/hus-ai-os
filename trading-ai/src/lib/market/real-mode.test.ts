import { describe, expect, it } from "vitest";
import {
  getDataMode,
  getMissingApiKeys,
  isRealMarketDataMode,
  PUBLIC_LIVE_PROVIDERS,
} from "@/lib/market/config";
import { resolveYahooTicker, parseForexPair, LIVE_PROBE_SYMBOLS } from "@/lib/market/symbols";

describe("real market data mode config", () => {
  it("defaults to real market data mode", () => {
    expect(isRealMarketDataMode()).toBe(true);
  });

  it("lists public live providers", () => {
    expect(PUBLIC_LIVE_PROVIDERS).toContain("yahoo");
    expect(PUBLIC_LIVE_PROVIDERS).toContain("coingecko");
    expect(PUBLIC_LIVE_PROVIDERS).toContain("frankfurter");
  });

  it("reports missing API keys without failing build", () => {
    const missing = getMissingApiKeys();
    expect(Array.isArray(missing)).toBe(true);
    expect(missing).toContain("FINNHUB_API_KEY");
  });

  it("returns live or mixed data mode when real mode on", () => {
    const mode = getDataMode();
    expect(["live", "mixed"]).toContain(mode);
  });
});

describe("yahoo symbol mapping", () => {
  it("maps Saudi symbols to .SR", () => {
    expect(resolveYahooTicker("2222")).toBe("2222.SR");
  });

  it("maps indices and commodities", () => {
    expect(resolveYahooTicker("SPX")).toBe("^GSPC");
    expect(resolveYahooTicker("CLUSD")).toBe("CL=F");
  });

  it("maps forex pairs", () => {
    expect(resolveYahooTicker("EURUSD")).toBe("EURUSD=X");
    expect(parseForexPair("EURUSD")).toEqual({ from: "EUR", to: "USD" });
  });

  it("defines probe symbols for all markets", () => {
    expect(LIVE_PROBE_SYMBOLS.usStock).toBe("AAPL");
    expect(LIVE_PROBE_SYMBOLS.saudi).toBe("2222");
    expect(LIVE_PROBE_SYMBOLS.crypto).toBe("BTCUSD");
  });
});
