import type { Recommendation, RiskLevel } from "@/types/trading";
import { computeSignalScore } from "@/lib/ai/analysis-engine";
import { generateMockBars, getMockAsset } from "@/lib/data/mock-market";
import { hashSymbol } from "@/lib/data/seed";
import { computeTechnical } from "@/lib/market/indicators";
import {
  MARKET_CATEGORIES,
  getAllActiveSymbols,
  getAssetBySymbol,
  getAssetsByMarketTab,
  universeCategoryToAssetClass,
  type MarketCategory,
} from "@/lib/markets/asset-universe";
import { computePeriodChanges } from "@/lib/markets/period-changes";
import { getAssetLogoProps } from "@/lib/markets/asset-logo";
import { unifiedQuote } from "@/lib/market/unified";

export { MARKET_CATEGORIES, type MarketCategory };

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
  displaySymbol: string;
  name: string;
  category: string;
  categoryLabel: string;
  market: string;
  exchange: string;
  sector: string;
  price: number;
  changePct: number;
  expectedReturnPct: number;
  riskScore: number;
  aiConfidence: number;
  aiOpportunityScore: number;
  recommendation: Recommendation;
  whySelected: string;
  whySelectedAr: string;
  dataSource: "live" | "demo" | "cached" | "seeded";
  quoteSource: string;
  volume: number;
  weekChangePct: number;
  monthChangePct: number;
  industry: string;
  logo: { initials: string; color: string };
  signalScore: number;
  riskLevel: RiskLevel;
};

const DIVIDEND_SYMBOLS = new Set(["KO", "JPM", "XOM", "MSFT", "AAPL", "2222", "1120", "1180"]);

function riskLevelToScore(level: RiskLevel): number {
  if (level === "low") return 25;
  if (level === "medium") return 50;
  if (level === "high") return 75;
  return 90;
}

function dataSourceBadge(isDemo: boolean, quoteAttempted: boolean): "live" | "demo" | "cached" | "seeded" {
  if (!quoteAttempted) return "seeded";
  return isDemo ? "demo" : "live";
}

export function getAllCatalogSymbols(): string[] {
  return getAllActiveSymbols();
}

export function matchesCategory(symbol: string, category: MarketCategory): boolean {
  const asset = getAssetBySymbol(symbol);
  if (!asset) return false;
  return getAssetsByMarketTab(category).some((a) => a.symbol === asset.symbol);
}

export function matchesSearch(symbol: string, query: string): boolean {
  const asset = getAssetBySymbol(symbol);
  if (!asset) return false;
  if (!query.trim()) return true;
  const q = query.trim().toUpperCase();
  return (
    asset.symbol.toUpperCase().includes(q) ||
    asset.displaySymbol.toUpperCase().includes(q) ||
    asset.name.toUpperCase().includes(q)
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

function scoreAssetFast(symbol: string) {
  const bars = generateMockBars(symbol, 60);
  const mock = getMockAsset(symbol);
  const technical = computeTechnical(bars);
  const signal = computeSignalScore(symbol, bars, mock.price, mock.changePct);
  return { bars, mock, technical, signal };
}

export async function buildMarketBrowseItem(
  symbol: string,
  precomputed?: ReturnType<typeof scoreAssetFast>
): Promise<MarketBrowseItem & { _sort: ReturnType<typeof sortMetrics> }> {
  const asset = getAssetBySymbol(symbol);
  const fast = precomputed ?? scoreAssetFast(symbol);

  let price = fast.mock.price;
  let changePct = fast.mock.changePct;
  let volume = fast.mock.volume;
  let isDemo = true;
  let quoteSource = "seeded";
  let quoteAttempted = false;

  try {
    const quote = await unifiedQuote(symbol);
    quoteAttempted = true;
    price = quote.data.price;
    changePct = quote.data.changePct;
    volume = quote.data.volume ?? volume;
    isDemo = quote.isDemoData;
    quoteSource = quote.source;
    fast.signal = computeSignalScore(symbol, fast.bars, price, changePct);
  } catch {
    /* keep seeded mock quote */
  }

  const why = buildWhySelected(symbol, fast.signal, fast.technical);
  const expectedReturnPct = Number(((fast.signal.score - 50) * 0.15 + changePct * 0.6).toFixed(2));
  const aiOpportunityScore = Number((fast.signal.score * fast.signal.confidence).toFixed(1));
  const assetClass = asset ? universeCategoryToAssetClass(asset) : fast.mock.assetClass;
  const periods = computePeriodChanges(fast.bars, price);
  const logo = getAssetLogoProps(symbol, asset?.name ?? fast.mock.name);

  const item: MarketBrowseItem = {
    rank: 0,
    symbol,
    displaySymbol: asset?.displaySymbol ?? symbol,
    name: asset?.name ?? fast.mock.name,
    category: assetClass,
    categoryLabel: assetClass,
    market: asset?.market ?? asset?.country ?? "—",
    exchange: asset?.exchange ?? fast.mock.exchange,
    sector: asset?.sector ?? "—",
    industry: asset?.industry ?? "—",
    price,
    changePct,
    weekChangePct: periods.weekChangePct,
    monthChangePct: periods.monthChangePct,
    expectedReturnPct,
    riskScore: riskLevelToScore(fast.signal.riskLevel),
    aiConfidence: fast.signal.confidence,
    aiOpportunityScore,
    recommendation: fast.signal.recommendation,
    whySelected: why.en,
    whySelectedAr: why.ar,
    dataSource: dataSourceBadge(isDemo, quoteAttempted),
    quoteSource,
    volume,
    logo,
    signalScore: fast.signal.score,
    riskLevel: fast.signal.riskLevel,
  };

  return { ...item, _sort: sortMetrics(item, fast.technical, symbol) };
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

/** Fast ranking pass using mock bars — live quotes fetched only for current page. */
export function rankUniverseSymbols(symbols: string[], sort: MarketSortOption) {
  const scored = symbols.map((symbol) => {
    const fast = scoreAssetFast(symbol);
    const asset = getAssetBySymbol(symbol);
    const expectedReturnPct = Number(((fast.signal.score - 50) * 0.15 + fast.mock.changePct * 0.6).toFixed(2));
    const item = {
      rank: 0,
      symbol,
      displaySymbol: asset?.displaySymbol ?? symbol,
      name: asset?.name ?? fast.mock.name,
      category: asset ? universeCategoryToAssetClass(asset) : fast.mock.assetClass,
      categoryLabel: asset ? universeCategoryToAssetClass(asset) : fast.mock.assetClass,
      market: asset?.market ?? "—",
      exchange: asset?.exchange ?? fast.mock.exchange,
      sector: asset?.sector ?? "—",
      industry: asset?.industry ?? "—",
      price: fast.mock.price,
      changePct: fast.mock.changePct,
      weekChangePct: computePeriodChanges(fast.bars, fast.mock.price).weekChangePct,
      monthChangePct: computePeriodChanges(fast.bars, fast.mock.price).monthChangePct,
      expectedReturnPct,
      riskScore: riskLevelToScore(fast.signal.riskLevel),
      aiConfidence: fast.signal.confidence,
      aiOpportunityScore: Number((fast.signal.score * fast.signal.confidence).toFixed(1)),
      recommendation: fast.signal.recommendation,
      whySelected: "",
      whySelectedAr: "",
      dataSource: "seeded" as const,
      quoteSource: "mock",
      volume: fast.mock.volume,
      logo: getAssetLogoProps(symbol, asset?.name ?? fast.mock.name),
      signalScore: fast.signal.score,
      riskLevel: fast.signal.riskLevel,
      _sort: sortMetrics(
        {
          rank: 0,
          symbol,
          displaySymbol: symbol,
          name: fast.mock.name,
          category: "stock",
          categoryLabel: "stock",
          market: "—",
          exchange: fast.mock.exchange,
          sector: "—",
          industry: "—",
          weekChangePct: 0,
          monthChangePct: 0,
          logo: getAssetLogoProps(symbol),
          price: fast.mock.price,
          changePct: fast.mock.changePct,
          expectedReturnPct,
          riskScore: riskLevelToScore(fast.signal.riskLevel),
          aiConfidence: fast.signal.confidence,
          aiOpportunityScore: fast.signal.score * fast.signal.confidence,
          recommendation: fast.signal.recommendation,
          whySelected: "",
          whySelectedAr: "",
          dataSource: "seeded",
          quoteSource: "mock",
          volume: fast.mock.volume,
          signalScore: fast.signal.score,
          riskLevel: fast.signal.riskLevel,
        },
        fast.technical,
        symbol
      ),
      _fast: fast,
    };
    return item;
  });
  return sortMarketItems(scored, sort);
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
  universeTotal: number;
}> {
  const category = opts.category ?? "all";
  const sort = opts.sort ?? "ai_opportunity";
  const search = opts.search ?? "";
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(6, opts.pageSize ?? 12));

  const assets = getAssetsByMarketTab(category, search);
  const symbols = assets.map((a) => a.symbol);

  if (symbols.length === 0) {
    return {
      items: [],
      page,
      pageSize,
      total: 0,
      hasMore: false,
      category,
      sort,
      universeTotal: getAllActiveSymbols().length,
    };
  }

  const ranked = rankUniverseSymbols(symbols, sort);
  const total = ranked.length;
  const start = (page - 1) * pageSize;
  const pageSlice = ranked.slice(start, start + pageSize);

  const items = await Promise.all(pageSlice.map((row) => buildMarketBrowseItem(row.symbol, row._fast)));
  const withRanks = items.map((item, i) => {
    const { _sort: _ignored, ...rest } = item;
    return { ...rest, rank: start + i + 1 };
  });

  return {
    items: withRanks,
    page,
    pageSize,
    total,
    hasMore: start + pageSize < total,
    category,
    sort,
    universeTotal: getAllActiveSymbols().length,
  };
}
