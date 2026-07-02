import type { AssetClass, Recommendation, RiskLevel } from "@/types/trading";
import { computeSignalScore } from "@/lib/ai/analysis-engine";
import { MOCK_UNIVERSE } from "@/lib/data/mock-market";
import { hashSymbol } from "@/lib/data/seed";
import { computeTechnical } from "@/lib/market/indicators";
import { SYMBOL_CATALOG, getCatalogEntry } from "@/lib/market/catalog";
import { unifiedCandles, unifiedQuote } from "@/lib/market/unified";

export const MARKET_CATEGORIES = [
  "all",
  "saudi",
  "us",
  "global",
  "etf",
  "crypto",
  "forex",
  "commodity",
  "gold",
  "oil",
  "index",
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export const MARKET_SORT_OPTIONS = [
  "ai_opportunity",
  "expected_return",
  "lowest_risk",
  "highest_confidence",
  "biggest_gainers",
  "biggest_losers",
  "highest_volume",
  "best_risk_reward",
  "best_long_term",
  "best_day_trade",
  "best_swing_trade",
  "best_dividend",
  "trending_now",
  "news_impact",
  "breakout_candidates",
  "oversold_opportunities",
] as const;

export type MarketSortOption = (typeof MARKET_SORT_OPTIONS)[number];

export type MarketBrowseItem = {
  rank: number;
  symbol: string;
  name: string;
  category: AssetClass;
  categoryLabel: string;
  market: string;
  price: number;
  changePct: number;
  expectedReturnPct: number;
  riskScore: number;
  aiConfidence: number;
  aiOpportunityScore: number;
  recommendation: Recommendation;
  whySelected: string;
  whySelectedAr: string;
  dataSource: "live" | "demo" | "cached";
  quoteSource: string;
  volume: number;
  signalScore: number;
  riskLevel: RiskLevel;
};

const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "AMEX"]);
const GOLD_SYMBOLS = new Set(["GCUSD", "GLD", "GLDM"]);
const OIL_SYMBOLS = new Set(["CLUSD", "USO", "BNO", "XLE"]);
const DIVIDEND_SYMBOLS = new Set(["KO", "JPM", "XOM", "MSFT", "AAPL", "2222", "1120"]);

function riskLevelToScore(level: RiskLevel): number {
  if (level === "low") return 25;
  if (level === "medium") return 50;
  if (level === "high") return 75;
  return 90;
}

function dataSourceBadge(isDemo: boolean, cached?: boolean): "live" | "demo" | "cached" {
  if (cached) return "cached";
  return isDemo ? "demo" : "live";
}

export function getAllCatalogSymbols(): string[] {
  return Object.keys(MOCK_UNIVERSE);
}

export function matchesCategory(symbol: string, category: MarketCategory): boolean {
  if (category === "all") return true;
  const entry = getCatalogEntry(symbol);
  const meta = MOCK_UNIVERSE[symbol];
  if (!entry || !meta) return false;

  switch (category) {
    case "saudi":
      return meta.assetClass === "saudi" || meta.exchange === "Tadawul";
    case "us":
      return meta.assetClass === "stock" && US_EXCHANGES.has(meta.exchange);
    case "global":
      return meta.assetClass === "stock" && meta.region === "Global";
    case "etf":
      return meta.assetClass === "etf";
    case "crypto":
      return meta.assetClass === "crypto";
    case "forex":
      return meta.assetClass === "forex";
    case "commodity":
      return meta.assetClass === "commodity";
    case "gold":
      return GOLD_SYMBOLS.has(symbol) || /gold/i.test(meta.name);
    case "oil":
      return OIL_SYMBOLS.has(symbol) || /oil|crude|brent|energy select/i.test(meta.name);
    case "index":
      return meta.assetClass === "index";
    default:
      return true;
  }
}

export function matchesSearch(symbol: string, query: string): boolean {
  const q = query.trim().toUpperCase();
  if (!q) return true;
  const entry = getCatalogEntry(symbol);
  if (!entry) return symbol.toUpperCase().includes(q);
  return (
    entry.symbol.toUpperCase().includes(q) ||
    entry.name.toUpperCase().includes(q) ||
    entry.exchange.toUpperCase().includes(q) ||
    entry.assetClass.toUpperCase().includes(q)
  );
}

function buildWhySelected(
  symbol: string,
  signal: ReturnType<typeof computeSignalScore>,
  technical: ReturnType<typeof computeTechnical>
): { en: string; ar: string } {
  const rec = signal.recommendation.toUpperCase();
  const en = `${rec} signal (${signal.score}/100) · ${technical.trend} trend · RSI ${technical.rsi.toFixed(0)} · conf ${(signal.confidence * 100).toFixed(0)}%`;
  const recAr = signal.recommendation === "buy" ? "شراء" : signal.recommendation === "sell" ? "بيع" : "احتفاظ";
  const ar = `${recAr} (${signal.score}/100) · اتجاه ${technical.trend === "bullish" ? "صاعد" : technical.trend === "bearish" ? "هابط" : "محايد"} · RSI ${technical.rsi.toFixed(0)}`;
  return { en, ar: `${ar} · ${symbol}` };
}

function sortMetrics(item: MarketBrowseItem, technical: ReturnType<typeof computeTechnical>, symbol: string) {
  const vol = technical.volatility || 0.3;
  const absChange = Math.abs(item.changePct);
  return {
    expectedReturn: Number(((item.signalScore - 50) * 0.15 + item.changePct * 0.6).toFixed(2)),
    riskReward: item.riskScore > 0 ? item.expectedReturnPct / item.riskScore : 0,
    longTerm: item.signalScore * 0.55 + (100 - vol * 100) * 0.45,
    dayTrade: vol * 100 * absChange,
    swingTrade: technical.trendStrength * 0.6 + absChange * 4,
    dividend: DIVIDEND_SYMBOLS.has(symbol) ? item.signalScore + 15 : item.signalScore * 0.5,
    trending: Math.log10(Math.max(item.volume, 1)) * (absChange + 1),
    newsImpact: (hashSymbol(symbol + "news") % 40) + item.signalScore * 0.4,
    breakout: technical.trend === "bullish" && item.price >= technical.resistance * 0.98 ? 100 : technical.trendStrength,
    oversold: technical.rsi < 35 ? 100 - technical.rsi : 0,
  };
}

export async function buildMarketBrowseItem(symbol: string): Promise<MarketBrowseItem & { _sort: ReturnType<typeof sortMetrics> }> {
  const entry = getCatalogEntry(symbol);
  const meta = MOCK_UNIVERSE[symbol];
  const [candles, quote] = await Promise.all([unifiedCandles(symbol, "1Day", 60), unifiedQuote(symbol)]);
  const bars = candles.data.map(({ source, isDemoData, ...bar }) => bar);
  const signal = computeSignalScore(symbol, bars, quote.data.price, quote.data.changePct);
  const technical = computeTechnical(bars);
  const why = buildWhySelected(symbol, signal, technical);
  const expectedReturnPct = Number(((signal.score - 50) * 0.15 + signal.changePct * 0.6).toFixed(2));
  const aiOpportunityScore = Number((signal.score * signal.confidence).toFixed(1));

  const item: MarketBrowseItem = {
    rank: 0,
    symbol,
    name: entry?.name ?? meta?.name ?? symbol,
    category: entry?.assetClass ?? meta?.assetClass ?? "stock",
    categoryLabel: entry?.assetClass ?? meta?.assetClass ?? "stock",
    market: entry?.exchange ?? meta?.exchange ?? "—",
    price: quote.data.price,
    changePct: quote.data.changePct,
    expectedReturnPct,
    riskScore: riskLevelToScore(signal.riskLevel),
    aiConfidence: signal.confidence,
    aiOpportunityScore,
    recommendation: signal.recommendation,
    whySelected: why.en,
    whySelectedAr: why.ar,
    dataSource: dataSourceBadge(quote.isDemoData || candles.isDemoData),
    quoteSource: quote.source,
    volume: quote.data.volume ?? 0,
    signalScore: signal.score,
    riskLevel: signal.riskLevel,
  };

  return { ...item, _sort: sortMetrics(item, technical, symbol) };
}

export function sortMarketItems<T extends MarketBrowseItem & { _sort?: ReturnType<typeof sortMetrics> }>(
  items: T[],
  sort: MarketSortOption
): T[] {
  const sorted = [...items];
  const cmp = (a: T, b: T) => {
    switch (sort) {
      case "ai_opportunity":
        return b.aiOpportunityScore - a.aiOpportunityScore;
      case "expected_return":
        return b.expectedReturnPct - a.expectedReturnPct;
      case "lowest_risk":
        return a.riskScore - b.riskScore;
      case "highest_confidence":
        return b.aiConfidence - a.aiConfidence;
      case "biggest_gainers":
        return b.changePct - a.changePct;
      case "biggest_losers":
        return a.changePct - b.changePct;
      case "highest_volume":
        return b.volume - a.volume;
      case "best_risk_reward":
        return (b._sort?.riskReward ?? 0) - (a._sort?.riskReward ?? 0);
      case "best_long_term":
        return (b._sort?.longTerm ?? 0) - (a._sort?.longTerm ?? 0);
      case "best_day_trade":
        return (b._sort?.dayTrade ?? 0) - (a._sort?.dayTrade ?? 0);
      case "best_swing_trade":
        return (b._sort?.swingTrade ?? 0) - (a._sort?.swingTrade ?? 0);
      case "best_dividend":
        return (b._sort?.dividend ?? 0) - (a._sort?.dividend ?? 0);
      case "trending_now":
        return (b._sort?.trending ?? 0) - (a._sort?.trending ?? 0);
      case "news_impact":
        return (b._sort?.newsImpact ?? 0) - (a._sort?.newsImpact ?? 0);
      case "breakout_candidates":
        return (b._sort?.breakout ?? 0) - (a._sort?.breakout ?? 0);
      case "oversold_opportunities":
        return (b._sort?.oversold ?? 0) - (a._sort?.oversold ?? 0);
      default:
        return b.aiOpportunityScore - a.aiOpportunityScore;
    }
  };
  sorted.sort(cmp);
  return sorted.map((item, i) => ({ ...item, rank: i + 1 }));
}

export async function browseMarkets(opts: {
  category?: MarketCategory;
  sort?: MarketSortOption;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: MarketBrowseItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  category: MarketCategory;
  sort: MarketSortOption;
}> {
  const category = opts.category ?? "all";
  const sort = opts.sort ?? "ai_opportunity";
  const search = opts.search ?? "";
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(6, opts.pageSize ?? 12));

  let symbols = getAllCatalogSymbols().filter((s) => matchesCategory(s, category) && matchesSearch(s, search));

  if (symbols.length === 0) {
    return { items: [], page, pageSize, total: 0, hasMore: false, category, sort };
  }

  const built = await Promise.all(symbols.map((s) => buildMarketBrowseItem(s)));
  const ranked = sortMarketItems(built, sort).map(({ _sort, ...item }) => item);

  const total = ranked.length;
  const start = (page - 1) * pageSize;
  const items = ranked.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    total,
    hasMore: start + pageSize < total,
    category,
    sort,
  };
}

export { SYMBOL_CATALOG };
