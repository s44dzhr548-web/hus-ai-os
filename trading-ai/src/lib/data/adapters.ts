import type { DataAdapter } from "@/types/trading";

export const DATA_ADAPTERS: DataAdapter[] = [
  {
    name: "Mock Market Data",
    assetClasses: ["stock", "crypto", "forex", "saudi"],
    status: "mock",
    description: "Deterministic seeded mock OHLCV — active in demo mode",
  },
  {
    name: "Alpaca Markets",
    assetClasses: ["stock"],
    status: "requires_oauth",
    description: "US equities paper trading — requires ALPACA_API_KEY",
  },
  {
    name: "Saudi Tadawul",
    assetClasses: ["saudi"],
    status: "ready",
    description: "Mock Saudi market symbols (2222, 1120, 2010) — live adapter pending OAuth",
  },
  {
    name: "Crypto Aggregator",
    assetClasses: ["crypto"],
    status: "ready",
    description: "Mock BTC/ETH — live CoinGecko/Binance adapter pending API key",
  },
  {
    name: "Forex Feed",
    assetClasses: ["forex"],
    status: "ready",
    description: "Mock major pairs — live OANDA/FXCM adapter pending OAuth",
  },
  {
    name: "News API",
    assetClasses: ["stock", "crypto", "forex", "saudi"],
    status: "ready",
    description: "Mock news sentiment — NewsAPI adapter pending API key",
  },
  {
    name: "Economic Calendar",
    assetClasses: ["stock", "forex"],
    status: "mock",
    description: "Mock macro events — TradingEconomics adapter pending payment",
  },
  {
    name: "Broker Execution",
    assetClasses: ["stock", "crypto", "forex"],
    status: "requires_oauth",
    description: "DISABLED — real broker execution blocked in compliance mode",
  },
];

export function getDataMode(): "mock" | "live" {
  return process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET ? "live" : "mock";
}
