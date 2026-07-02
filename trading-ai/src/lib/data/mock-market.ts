import type { AssetClass, MarketAsset, MarketBar } from "@/types/trading";
import { hashSymbol, seededRandom } from "./seed";

export const MOCK_UNIVERSE: Record<
  string,
  { name: string; assetClass: AssetClass; exchange: string; currency: string; basePrice: number }
> = {
  AAPL: { name: "Apple Inc.", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 178 },
  MSFT: { name: "Microsoft", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 415 },
  GOOGL: { name: "Alphabet", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 175 },
  TSLA: { name: "Tesla", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 248 },
  NVDA: { name: "NVIDIA", assetClass: "stock", exchange: "NASDAQ", currency: "USD", basePrice: 875 },
  SPY: { name: "S&P 500 ETF", assetClass: "stock", exchange: "NYSE", currency: "USD", basePrice: 520 },
  BTCUSD: { name: "Bitcoin", assetClass: "crypto", exchange: "Crypto", currency: "USD", basePrice: 67000 },
  ETHUSD: { name: "Ethereum", assetClass: "crypto", exchange: "Crypto", currency: "USD", basePrice: 3500 },
  EURUSD: { name: "Euro / US Dollar", assetClass: "forex", exchange: "FX", currency: "USD", basePrice: 1.08 },
  GBPUSD: { name: "British Pound / USD", assetClass: "forex", exchange: "FX", currency: "USD", basePrice: 1.27 },
  USDJPY: { name: "USD / Japanese Yen", assetClass: "forex", exchange: "FX", currency: "JPY", basePrice: 157 },
  2222: { name: "Saudi Aramco", assetClass: "saudi", exchange: "Tadawul", currency: "SAR", basePrice: 28.5 },
  1120: { name: "Al Rajhi Bank", assetClass: "saudi", exchange: "Tadawul", currency: "SAR", basePrice: 92 },
  2010: { name: "SABIC", assetClass: "saudi", exchange: "Tadawul", currency: "SAR", basePrice: 88 },
  QQQ: { name: "Invesco QQQ Trust", assetClass: "etf", exchange: "NASDAQ", currency: "USD", basePrice: 440 },
  GLD: { name: "SPDR Gold Shares", assetClass: "etf", exchange: "NYSE", currency: "USD", basePrice: 215 },
  XLE: { name: "Energy Select Sector SPDR", assetClass: "etf", exchange: "NYSE", currency: "USD", basePrice: 92 },
  USO: { name: "United States Oil Fund", assetClass: "etf", exchange: "NYSE", currency: "USD", basePrice: 72 },
  CLUSD: { name: "Crude Oil WTI", assetClass: "commodity", exchange: "COMEX", currency: "USD", basePrice: 78 },
  GCUSD: { name: "Gold Spot", assetClass: "commodity", exchange: "COMEX", currency: "USD", basePrice: 2350 },
  SIUSD: { name: "Silver Spot", assetClass: "commodity", exchange: "COMEX", currency: "USD", basePrice: 28 },
  SPX: { name: "S&P 500 Index", assetClass: "index", exchange: "NYSE", currency: "USD", basePrice: 5200 },
  DJI: { name: "Dow Jones Industrial", assetClass: "index", exchange: "NYSE", currency: "USD", basePrice: 39000 },
  IXIC: { name: "NASDAQ Composite", assetClass: "index", exchange: "NASDAQ", currency: "USD", basePrice: 16500 },
  TASI: { name: "Tadawul All Share", assetClass: "index", exchange: "Tadawul", currency: "SAR", basePrice: 11800 },
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
