import type { AssetClass, MarketAsset, MarketBar } from "@/types/trading";
import { hashSymbol, seededRandom } from "./seed";

export const MOCK_UNIVERSE: Record<
  string,
  {
    name: string;
    assetClass: AssetClass;
    exchange: string;
    currency: string;
    basePrice: number;
    region?: "US" | "SA" | "Global";
  }
> = {
  AAPL: { name: "Apple Inc.", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 178, region: "US" },
  MSFT: { name: "Microsoft", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 415, region: "US" },
  GOOGL: { name: "Alphabet", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 175, region: "US" },
  TSLA: { name: "Tesla", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 248, region: "US" },
  NVDA: { name: "NVIDIA", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 875, region: "US" },
  AMZN: { name: "Amazon", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 185, region: "US" },
  META: { name: "Meta Platforms", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 480, region: "US" },
  JPM: { name: "JPMorgan Chase", assetClass: "stock", exchange: "NYSE", currency: "USD", basePrice: 195, region: "US" },
  KO: { name: "Coca-Cola", assetClass: "stock", exchange: "NYSE", currency: "USD", basePrice: 62, region: "US" },
  XOM: { name: "Exxon Mobil", assetClass: "stock", exchange: "NYSE", currency: "USD", basePrice: 110, region: "US" },
  SPY: { name: "S&P 500 ETF", assetClass: "etf", exchange: "NYSE", currency: "USD", basePrice: 520, region: "US" },
  BTCUSD: { name: "Bitcoin", assetClass: "crypto", exchange: "Crypto", currency: "USD", basePrice: 67000 },
  ETHUSD: { name: "Ethereum", assetClass: "crypto", exchange: "Crypto", currency: "USD", basePrice: 3500 },
  SOLUSD: { name: "Solana", assetClass: "crypto", exchange: "Crypto", currency: "USD", basePrice: 145 },
  EURUSD: { name: "Euro / US Dollar", assetClass: "forex", exchange: "FX", currency: "USD", basePrice: 1.08 },
  GBPUSD: { name: "British Pound / USD", assetClass: "forex", exchange: "FX", currency: "USD", basePrice: 1.27 },
  USDJPY: { name: "USD / Japanese Yen", assetClass: "forex", exchange: "FX", currency: "JPY", basePrice: 157 },
  2222: { name: "Saudi Aramco", assetClass: "saudi", exchange: "Tadawul", currency: "SAR", basePrice: 28.5, region: "SA" },
  1120: { name: "Al Rajhi Bank", assetClass: "saudi", exchange: "Tadawul", currency: "SAR", basePrice: 92, region: "SA" },
  2010: { name: "SABIC", assetClass: "saudi", exchange: "Tadawul", currency: "SAR", basePrice: 88, region: "SA" },
  1180: { name: "Saudi National Bank", assetClass: "saudi", exchange: "Tadawul", currency: "SAR", basePrice: 38, region: "SA" },
  QQQ: { name: "Invesco QQQ Trust", assetClass: "etf", exchange: "NASDAQ", currency: "USD", basePrice: 440, region: "US" },
  IWM: { name: "Russell 2000 ETF", assetClass: "etf", exchange: "AMEX", currency: "USD", basePrice: 210, region: "US" },
  GLD: { name: "SPDR Gold Shares", assetClass: "etf", exchange: "NYSE", currency: "USD", basePrice: 215, region: "US" },
  GLDM: { name: "SPDR Gold MiniShares", assetClass: "etf", exchange: "NYSE", currency: "USD", basePrice: 42, region: "US" },
  XLE: { name: "Energy Select Sector SPDR", assetClass: "etf", exchange: "NYSE", currency: "USD", basePrice: 92, region: "US" },
  USO: { name: "United States Oil Fund", assetClass: "etf", exchange: "NYSE", currency: "USD", basePrice: 72, region: "US" },
  BNO: { name: "United States Brent Oil", assetClass: "etf", exchange: "NYSE", currency: "USD", basePrice: 28, region: "US" },
  CLUSD: { name: "Crude Oil WTI", assetClass: "commodity", exchange: "COMEX", currency: "USD", basePrice: 78 },
  GCUSD: { name: "Gold Spot", assetClass: "commodity", exchange: "COMEX", currency: "USD", basePrice: 2350 },
  SIUSD: { name: "Silver Spot", assetClass: "commodity", exchange: "COMEX", currency: "USD", basePrice: 28 },
  BP: { name: "BP plc", assetClass: "stock", exchange: "LSE", currency: "GBP", basePrice: 480, region: "Global" },
  SAP: { name: "SAP SE", assetClass: "stock", exchange: "XETRA", currency: "EUR", basePrice: 180, region: "Global" },
  TM: { name: "Toyota Motor", assetClass: "stock", exchange: "TSE", currency: "JPY", basePrice: 2800, region: "Global" },
  SPX: { name: "S&P 500 Index", assetClass: "index", exchange: "NYSE", currency: "USD", basePrice: 5200, region: "US" },
  DJI: { name: "Dow Jones Industrial", assetClass: "index", exchange: "NYSE", currency: "USD", basePrice: 39000, region: "US" },
  IXIC: { name: "NASDAQ Composite", assetClass: "index", exchange: "NASDAQ", currency: "USD", basePrice: 16500, region: "US" },
  TASI: { name: "Tadawul All Share", assetClass: "index", exchange: "Tadawul", currency: "SAR", basePrice: 11800, region: "SA" },
};

export const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "BTCUSD", "2222", "EURUSD", "SPX", "CLUSD", "QQQ"];

export function generateMockBars(symbol: string, days = 90): MarketBar[] {
  const meta = MOCK_UNIVERSE[symbol] ?? {
    name: symbol,
    assetClass: "stock" as const,
    exchange: "MOCK",
    currency: "USD",
    basePrice: 50 + (hashSymbol(symbol) % 200),
  };
  const rand = seededRandom(symbol + "-bars");
  const bars: MarketBar[] = [];
  let price = meta.basePrice * (0.95 + rand() * 0.1);
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const volatility =
      meta.assetClass === "crypto"
        ? 0.04
        : meta.assetClass === "forex"
          ? 0.008
          : meta.assetClass === "commodity"
            ? 0.025
            : 0.02;
    const change = (rand() - 0.48) * price * volatility;
    const open = price;
    const close = Math.max(0.01, price + change);
    const high = Math.max(open, close) * (1 + rand() * 0.01);
    const low = Math.min(open, close) * (1 - rand() * 0.01);
    bars.push({
      symbol,
      timeframe: "1Day",
      bar_time: d.toISOString(),
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(Math.max(0.01, low).toFixed(4)),
      close: Number(close.toFixed(4)),
      volume: Math.floor(rand() * 5_000_000 + 100_000),
    });
    price = close;
  }
  return bars;
}

export function getMockAsset(symbol: string): MarketAsset {
  const bars = generateMockBars(symbol, 2);
  const meta = MOCK_UNIVERSE[symbol] ?? {
    name: symbol,
    assetClass: "stock" as const,
    exchange: "MOCK",
    currency: "USD",
    basePrice: bars[bars.length - 1]?.close ?? 100,
  };
  const prev = bars[bars.length - 2]?.close ?? meta.basePrice;
  const last = bars[bars.length - 1]?.close ?? meta.basePrice;
  const changePct = prev > 0 ? ((last - prev) / prev) * 100 : 0;

  return {
    symbol,
    name: meta.name,
    assetClass: meta.assetClass,
    exchange: meta.exchange,
    currency: meta.currency,
    price: Number(last.toFixed(4)),
    changePct: Number(changePct.toFixed(2)),
    volume: bars[bars.length - 1]?.volume ?? 0,
    marketCap: meta.assetClass === "stock" ? last * 1_000_000_000 : undefined,
  };
}

export function getMockMarketOverview(symbols = Object.keys(MOCK_UNIVERSE)) {
  const assets = symbols.map(getMockAsset);
  const sorted = [...assets].sort((a, b) => b.changePct - a.changePct);
  return {
    mode: "mock" as const,
    assets,
    indices: assets.filter((a) =>
      ["SPY", "BTCUSD", "EURUSD", "SPX", "TASI", "QQQ"].includes(a.symbol)
    ),
    topGainers: sorted.slice(0, 3),
    topLosers: sorted.slice(-3).reverse(),
    updatedAt: new Date().toISOString(),
  };
}
