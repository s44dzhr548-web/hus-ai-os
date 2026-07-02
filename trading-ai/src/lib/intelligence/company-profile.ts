import type { MarketBar, Recommendation, RiskLevel } from "@/types/trading";
import { runAIAnalysis } from "@/lib/ai/analysis-engine";
import { hashSymbol } from "@/lib/data/seed";
import { getMockAsset } from "@/lib/data/mock-market";
import { getSectorImpact } from "@/lib/data/mock-news";
import { computeTechnical } from "@/lib/market/indicators";
import { assetClassForSymbol } from "@/lib/market/catalog";
import { hasKey, isRealMarketDataMode } from "@/lib/market/config";
import { unifiedCandles, unifiedQuote } from "@/lib/market/unified";
import { fetchNews } from "@/lib/market/providers/news";
import {
  getAllActiveAssets,
  getAssetBySymbol,
  universeCategoryToAssetClass,
} from "@/lib/markets/asset-universe";
import { getAssetLogoProps } from "@/lib/markets/asset-logo";
import { computePeriodChanges } from "@/lib/markets/period-changes";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  CompanyAnnouncement,
  CompanyFinancials,
  CompanyIntelligenceProfile,
  CompanyNewsItem,
  CompanyOverview,
  CompanyQuoteDetail,
  CompanyRiskAssessment,
  ProfileDataBadge,
  ProviderLinkStatus,
  RelatedAssetLink,
} from "./company-types";
import { buildAssetFlowProfile } from "./smart-money-engine";
import { resolveProfileSymbol } from "./symbol-resolver";

const DESCRIPTIONS: Record<string, string> = {
  "2222":
    "Saudi Arabian Oil Company (Saudi Aramco) is the world's largest integrated oil and gas company, operating across upstream, downstream, and petrochemicals.",
  AAPL: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and related services worldwide.",
  BTCUSD: "Bitcoin is the leading decentralized digital asset, traded against USD across global crypto markets.",
  MSFT: "Microsoft Corporation develops and licenses software, cloud services, devices, and AI platforms globally.",
  NVDA: "NVIDIA Corporation designs GPUs and AI accelerators powering data centers, gaming, and autonomous systems.",
};

const WEBSITES: Record<string, string> = {
  "2222": "https://www.aramco.com",
  AAPL: "https://www.apple.com",
  MSFT: "https://www.microsoft.com",
  NVDA: "https://www.nvidia.com",
  GOOGL: "https://abc.xyz",
  META: "https://about.meta.com",
  BTCUSD: "https://bitcoin.org",
};

function toBadge(isDemo: boolean, cacheHit?: boolean): ProfileDataBadge {
  if (cacheHit) return "cached";
  return isDemo ? "demo" : "live";
}

function riskLevelToScore(level: RiskLevel): number {
  if (level === "low") return 25;
  if (level === "medium") return 50;
  if (level === "high") return 75;
  return 90;
}

export function buildOverview(symbol: string): CompanyOverview {
  const asset = getAssetBySymbol(symbol)!;
  const mock = getMockAsset(symbol);
  const logo = getAssetLogoProps(symbol, asset.name);
  return {
    symbol: asset.symbol,
    displaySymbol: asset.displaySymbol,
    name: asset.name,
    assetClass: universeCategoryToAssetClass(asset),
    exchange: asset.exchange,
    sector: asset.sector,
    industry: asset.industry,
    country: asset.country,
    currency: asset.currency,
    market: asset.market,
    description:
      DESCRIPTIONS[symbol] ??
      `${asset.name} is a ${asset.industry.toLowerCase()} company listed on ${asset.exchange} in the ${asset.market} market.`,
    website: WEBSITES[symbol],
    marketCap: mock.price * (1_000_000 + hashSymbol(symbol) % 50_000_000),
    employees: asset.category.includes("stock") ? 5000 + (hashSymbol(symbol) % 200000) : undefined,
    logo,
  };
}

export async function buildQuoteDetail(symbol: string): Promise<CompanyQuoteDetail> {
  const asset = getAssetBySymbol(symbol)!;
  const candleResult = await unifiedCandles(symbol, "1Day", 260);
  const bars: MarketBar[] = candleResult.data.map(({ source, isDemoData, ...bar }) => bar);
  const quoteResult = await unifiedQuote(symbol);
  const price = quoteResult.data.price;
  const periods = computePeriodChanges(bars, price);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const prev = bars[bars.length - 2]?.close ?? price;
  const lastBar = bars[bars.length - 1];

  return {
    price,
    open: lastBar?.open ?? price,
    high: lastBar?.high ?? price,
    low: lastBar?.low ?? price,
    previousClose: prev,
    volume: quoteResult.data.volume ?? lastBar?.volume ?? 0,
    high52w: highs.length ? Math.max(...highs.slice(-252)) : undefined,
    low52w: lows.length ? Math.min(...lows.slice(-252)) : undefined,
    dayChangePct: quoteResult.data.changePct,
    weekChangePct: periods.weekChangePct,
    monthChangePct: periods.monthChangePct,
    yearChangePct: periods.yearChangePct,
    currency: asset.currency,
    dataSource: toBadge(quoteResult.isDemoData, quoteResult.cacheHit),
    provider: quoteResult.source,
    lastUpdated: quoteResult.data.timestamp ?? new Date().toISOString(),
  };
}

export function buildFinancials(symbol: string): CompanyFinancials {
  const asset = getAssetBySymbol(symbol);
  const mock = getMockAsset(symbol);
  const h = hashSymbol(symbol + "fin");
  const isStock = asset?.category.includes("stock") || asset?.category === "etf";
  const hasFinnhub = hasKey("FINNHUB_API_KEY");
  const hasPolygon = hasKey("POLYGON_API_KEY");

  if (!isStock) {
    return {
      dataSource: "seeded",
      provider: "universe",
      note: "Financial statements are not applicable for this asset class. Showing market metrics only.",
    };
  }

  const revenue = mock.price * (100_000 + (h % 900_000));
  const netIncome = revenue * (0.08 + (h % 20) / 100);
  const eps = netIncome / (1_000_000 + (h % 500_000_000));
  const pe = mock.price / Math.max(eps, 0.01);
  const provider = hasFinnhub ? "finnhub" : hasPolygon ? "polygon" : "seeded";

  return {
    revenue: Number(revenue.toFixed(0)),
    netIncome: Number(netIncome.toFixed(0)),
    eps: Number(eps.toFixed(2)),
    pe: Number(pe.toFixed(1)),
    peg: Number((pe / (5 + (h % 15))).toFixed(2)),
    debt: Number((revenue * (0.2 + (h % 30) / 100)).toFixed(0)),
    cashFlow: Number((netIncome * 1.2).toFixed(0)),
    grossMarginPct: Number((35 + (h % 25)).toFixed(1)),
    operatingMarginPct: Number((15 + (h % 20)).toFixed(1)),
    dividendYieldPct: asset?.sector === "Financials" ? Number((2 + (h % 4)).toFixed(2)) : Number((0.5 + (h % 3)).toFixed(2)),
    nextEarningsDate: new Date(Date.now() + (h % 90) * 86400000).toISOString().slice(0, 10),
    dataSource: hasFinnhub || hasPolygon ? "demo" : "seeded",
    provider,
    note:
      hasFinnhub || hasPolygon
        ? "Fundamentals use seeded ratios with provider keys detected. Licensed fundamentals feed pending."
        : "Seeded financial snapshot — connect FINNHUB_API_KEY or POLYGON_API_KEY for live fundamentals.",
  };
}

export function buildAnnouncements(symbol: string): CompanyAnnouncement[] {
  const asset = getAssetBySymbol(symbol)!;
  const h = hashSymbol(symbol + "ann");
  const isSaudi = asset.category === "saudi_stock";
  const isUS = asset.category === "us_stock";

  if (isSaudi) {
    return [
      {
        id: `${symbol}-ann-1`,
        title: "Tadawul Market Announcement",
        date: new Date(Date.now() - (h % 14) * 86400000).toISOString().slice(0, 10),
        type: "disclosure",
        url: "https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/issuer-news/",
        summary: "Recent issuer disclosure available on Saudi Exchange. Licensed announcement feed requires Tadawul data partnership.",
        dataSource: "seeded",
      },
      {
        id: `${symbol}-ann-2`,
        title: "Quarterly Results Update",
        date: new Date(Date.now() - (30 + (h % 30)) * 86400000).toISOString().slice(0, 10),
        type: "earnings",
        summary: `${asset.name} quarterly update — placeholder until licensed Saudi announcement provider is connected.`,
        dataSource: "seeded",
      },
    ];
  }

  if (isUS) {
    return [
      {
        id: `${symbol}-sec-1`,
        title: "SEC Filing — 10-Q / 10-K",
        date: new Date(Date.now() - (h % 45) * 86400000).toISOString().slice(0, 10),
        type: "sec_filing",
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=&dateb=&owner=include&count=10`,
        summary: "Link to SEC EDGAR filings. Live filing parser requires licensed SEC data integration.",
        dataSource: "seeded",
      },
      {
        id: `${symbol}-pr-1`,
        title: "Press Release",
        date: new Date(Date.now() - (h % 7) * 86400000).toISOString().slice(0, 10),
        type: "press_release",
        summary: `${asset.name} corporate update — demo placeholder pending news wire integration.`,
        dataSource: "seeded",
      },
    ];
  }

  return [
    {
      id: `${symbol}-gen-1`,
      title: "Market Update",
      date: new Date().toISOString().slice(0, 10),
      type: "market",
      summary: "No formal filings for this asset class. Monitor price, news, and macro drivers.",
      dataSource: "seeded",
    },
  ];
}

export async function buildNewsItems(symbol: string): Promise<{ items: CompanyNewsItem[]; dataSource: ProfileDataBadge }> {
  const newsResult = await fetchNews(symbol);
  return {
    dataSource: toBadge(newsResult.isDemoData),
    items: newsResult.items.slice(0, 8).map((n, i) => ({
      headline: n.headline,
      source: n.source,
      publishedAt: n.publishedAt ?? new Date(Date.now() - i * 3600000).toISOString(),
      sentiment: n.sentiment,
      impactScore: Number((40 + (hashSymbol(n.headline) % 60)).toFixed(0)),
    })),
  };
}

export async function buildTechnical(symbol: string) {
  const candleResult = await unifiedCandles(symbol, "1Day", 90);
  const bars: MarketBar[] = candleResult.data.map(({ source, isDemoData, ...bar }) => bar);
  return computeTechnical(bars);
}

export function buildRisk(symbol: string, technical: ReturnType<typeof computeTechnical>, recommendation: Recommendation, riskLevel: RiskLevel): CompanyRiskAssessment {
  const h = hashSymbol(symbol + "risk");
  const sector = getSectorImpact(symbol);
  return {
    volatilityRisk: Number((technical.volatility * 100).toFixed(0)),
    liquidityRisk: Number((20 + (h % 40)).toFixed(0)),
    sectorRisk: Math.abs(sector.impact) > 0.5 ? 70 : Math.abs(sector.impact) > 0.25 ? 45 : 25,
    correlationRisk: Number((25 + (h % 35)).toFixed(0)),
    newsRisk: Number((20 + (h % 50)).toFixed(0)),
    suggestedPositionPct: recommendation === "buy" ? 5 : recommendation === "hold" ? 3 : 1,
    summary: `Risk Guardian: ${riskLevel} risk · volatility ${(technical.volatility * 100).toFixed(0)}% · sector ${sector.sector}`,
    riskLevel,
  };
}

export function buildRelatedAssets(symbol: string): RelatedAssetLink[] {
  const asset = getAssetBySymbol(symbol)!;
  const peers = getAllActiveAssets()
    .filter((a) => a.symbol !== symbol && (a.sector === asset.sector || a.category === asset.category))
    .slice(0, 6);

  return peers.map((p) => ({
    symbol: p.symbol,
    displaySymbol: p.displaySymbol,
    name: p.name,
    relation: p.sector === asset.sector ? `${p.sector} sector peer` : `${p.market} market`,
  }));
}

export function buildProviderLinks(symbol: string, quoteSource: string, quoteDemo: boolean): ProviderLinkStatus[] {
  const now = new Date().toISOString();
  const quality = (connected: boolean, demo: boolean) => (connected && !demo ? 90 : demo ? 55 : 30);

  return [
    { id: "price", label: "Price provider", status: quoteDemo ? "demo_fallback" : "connected", lastUpdated: now, dataQualityScore: quality(true, quoteDemo) },
    { id: "financials", label: "Financial statements", status: hasKey("FINNHUB_API_KEY") || hasKey("POLYGON_API_KEY") ? "demo_fallback" : "missing", dataQualityScore: hasKey("FINNHUB_API_KEY") ? 60 : 35 },
    { id: "news", label: "News provider", status: isRealMarketDataMode() ? "connected" : "demo_fallback", lastUpdated: now, dataQualityScore: quality(true, !isRealMarketDataMode()) },
    { id: "announcements", label: "Announcements", status: assetClassForSymbol(symbol) === "saudi" ? "missing" : "demo_fallback", dataQualityScore: 40 },
    { id: "calendar", label: "Economic calendar", status: "connected", lastUpdated: now, dataQualityScore: 65 },
    { id: "technical", label: "Technical analysis engine", status: "connected", lastUpdated: now, dataQualityScore: 85 },
    { id: "ai", label: "AI recommendation engine", status: "connected", lastUpdated: now, dataQualityScore: 80 },
    { id: "risk", label: "Risk Guardian", status: "connected", lastUpdated: now, dataQualityScore: 82 },
    { id: "paper", label: "Paper trading engine", status: "connected", lastUpdated: now, dataQualityScore: 100 },
    { id: "journal", label: "Journal engine", status: "connected", lastUpdated: now, dataQualityScore: 90 },
    { id: "alerts", label: "Alert engine", status: "connected", lastUpdated: now, dataQualityScore: 88 },
  ];
}

export async function getCompanyIntelligenceProfile(symbolInput: string, locale: "ar" | "en" = "en"): Promise<CompanyIntelligenceProfile | null> {
  const symbol = resolveProfileSymbol(symbolInput);
  if (!symbol || !getAssetBySymbol(symbol)) return null;

  const [quote, analysis, newsPack, technical, moneyFlow] = await Promise.all([
    buildQuoteDetail(symbol),
    runAIAnalysis(symbol, locale),
    buildNewsItems(symbol),
    buildTechnical(symbol),
    buildAssetFlowProfile(symbol),
  ]);

  const overview = buildOverview(symbol);
  const financials = buildFinancials(symbol);
  const announcements = buildAnnouncements(symbol);
  const related = buildRelatedAssets(symbol);
  const risk = buildRisk(symbol, technical, analysis.recommendation, analysis.riskLevel);
  const providers = buildProviderLinks(symbol, quote.provider, quote.dataSource === "demo" || quote.dataSource === "seeded");

  const entryMid = quote.price * (analysis.recommendation === "buy" ? 0.98 : 1);
  const ai = {
    recommendation: analysis.recommendation,
    aiScore: analysis.signalScore,
    confidence: analysis.confidence,
    riskLevel: analysis.riskLevel,
    riskScore: riskLevelToScore(analysis.riskLevel),
    expectedUpsidePct: Number(((analysis.signalScore - 50) * 0.2).toFixed(2)),
    expectedDownsidePct: Number((-(100 - analysis.signalScore) * 0.15).toFixed(2)),
    entryZone: { low: Number((entryMid * 0.97).toFixed(2)), high: Number((entryMid * 1.01).toFixed(2)) },
    exitZone: { low: Number((quote.price * 1.03).toFixed(2)), high: Number((quote.price * 1.08).toFixed(2)) },
    stopLoss: Number((quote.price * 0.97).toFixed(2)),
    takeProfit: Number((quote.price * 1.06).toFixed(2)),
    reviewBy: analysis.explainability.reviewBy,
    dataSource: quote.dataSource,
  };

  const why = {
    technical: analysis.explanation.filter((e) => e.toLowerCase().includes("technical") || e.toLowerCase().includes("rsi") || e.toLowerCase().includes("support")),
    fundamental: analysis.explanation.filter((e) => e.toLowerCase().includes("sector") || e.toLowerCase().includes("fundamental")),
    news: analysis.explanation.filter((e) => e.toLowerCase().includes("news")),
    sector: [analysis.sectorImpact.summary],
    macro: analysis.explanation.filter((e) => e.toLowerCase().includes("macro") || e.toLowerCase().includes("fed")),
    oilImpact: `Oil sensitivity: ${(analysis.macroFactors.oilImpact * 100).toFixed(0)}%`,
    ratesImpact: `Rates sensitivity: ${(Math.abs(analysis.macroFactors.ratesImpact) * 100).toFixed(0)}%`,
    correlation: analysis.marketCorrelation.map((c) => `${c.index}: ${(c.correlation * 100).toFixed(0)}%`),
    invalidation: locale === "ar" ? [analysis.explainability.invalidation.ar] : [analysis.explainability.invalidation.en],
  };

  if (why.technical.length === 0) why.technical = [analysis.technical.summary];
  if (why.news.length === 0) why.news = newsPack.items.slice(0, 2).map((n) => n.headline);

  return {
    overview,
    quote,
    ai,
    why,
    financials,
    announcements,
    news: newsPack.items,
    technical,
    risk,
    providers,
    related,
    moneyFlow: moneyFlow ?? undefined,
    executionMode: "paper_only",
    brokerEnabled: false,
    persistenceConfigured: isSupabaseConfigured(),
  };
}

export { resolveProfileSymbol };
