export interface MarketBar {
  symbol: string;
  timeframe: string;
  bar_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  id?: string;
  symbol: string;
  strategy: string;
  direction: "long" | "short" | "neutral";
  strength: number;
  price_at_signal: number;
  metadata?: Record<string, unknown>;
}

export interface PaperTrade {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
}

export interface BacktestResult {
  finalEquity: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  trades: number;
  equityCurve: { date: string; equity: number }[];
}

export interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}
