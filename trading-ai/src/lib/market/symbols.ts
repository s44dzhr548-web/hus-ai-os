/** Maps internal symbols to Yahoo Finance tickers for live quotes/candles. */
const YAHOO_TICKERS: Record<string, string> = {
  AAPL: "AAPL",
  MSFT: "MSFT",
  GOOGL: "GOOGL",
  TSLA: "TSLA",
  NVDA: "NVDA",
  SPY: "SPY",
  QQQ: "QQQ",
  GLD: "GLD",
  XLE: "XLE",
  USO: "USO",
  "2222": "2222.SR",
  "1120": "1120.SR",
  "2010": "2010.SR",
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "USDJPY=X",
  CLUSD: "CL=F",
  GCUSD: "GC=F",
  SIUSD: "SI=F",
  SPX: "^GSPC",
  DJI: "^DJI",
  IXIC: "^IXIC",
  TASI: "^TASI.SR",
};

export function resolveYahooTicker(symbol: string): string {
  return YAHOO_TICKERS[symbol.toUpperCase()] ?? symbol;
}

export function parseForexPair(symbol: string): { from: string; to: string } | null {
  const s = symbol.toUpperCase();
  if (s.length !== 6) return null;
  return { from: s.slice(0, 3), to: s.slice(3, 6) };
}

export const LIVE_PROBE_SYMBOLS = {
  usStock: "AAPL",
  saudi: "2222",
  crypto: "BTCUSD",
  forex: "EURUSD",
  commodity: "CLUSD",
  index: "SPX",
  etf: "SPY",
} as const;
