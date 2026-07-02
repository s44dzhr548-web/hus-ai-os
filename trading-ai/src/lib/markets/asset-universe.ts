import type { AssetClass } from "@/types/trading";

export type MarketCategory =
  | "all"
  | "saudi"
  | "us"
  | "global"
  | "etf"
  | "crypto"
  | "forex"
  | "commodity"
  | "gold"
  | "oil"
  | "index";

export const MARKET_CATEGORIES: MarketCategory[] = [
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
];

/** Internal taxonomy for universe records (maps to dashboard market tabs). */
export type UniverseCategory =
  | "saudi_stock"
  | "us_stock"
  | "global_stock"
  | "etf"
  | "crypto"
  | "forex"
  | "commodity"
  | "gold"
  | "oil"
  | "gas"
  | "index";

export type AssetUniverseRecord = {
  id: string;
  symbol: string;
  displaySymbol: string;
  name: string;
  market: string;
  category: UniverseCategory;
  exchange: string;
  sector: string;
  industry: string;
  country: string;
  currency: string;
  provider: string;
  isActive: boolean;
  basePrice: number;
  region?: "US" | "SA" | "Global";
};

function saudi(
  code: string,
  name: string,
  sector: string,
  industry: string,
  basePrice: number
): AssetUniverseRecord {
  const symbol = code.replace(/\.SR$/i, "");
  return {
    id: `saudi-${symbol}`,
    symbol,
    displaySymbol: `${symbol}.SR`,
    name,
    market: "Saudi Arabia",
    category: "saudi_stock",
    exchange: "Tadawul",
    sector,
    industry,
    country: "SA",
    currency: "SAR",
    provider: "yahoo",
    isActive: true,
    basePrice,
    region: "SA",
  };
}

function usStock(
  symbol: string,
  name: string,
  exchange: "NASDAQ" | "NYSE" | "AMEX",
  sector: string,
  industry: string,
  basePrice: number
): AssetUniverseRecord {
  return {
    id: `us-${symbol}`,
    symbol,
    displaySymbol: symbol,
    name,
    market: "United States",
    category: "us_stock",
    exchange,
    sector,
    industry,
    country: "US",
    currency: "USD",
    provider: "yahoo",
    isActive: true,
    basePrice,
    region: "US",
  };
}

function globalStock(
  symbol: string,
  name: string,
  exchange: string,
  country: string,
  currency: string,
  sector: string,
  industry: string,
  basePrice: number
): AssetUniverseRecord {
  return {
    id: `global-${symbol}`,
    symbol,
    displaySymbol: symbol,
    name,
    market: country,
    category: "global_stock",
    exchange,
    sector,
    industry,
    country,
    currency,
    provider: "yahoo",
    isActive: true,
    basePrice,
    region: "Global",
  };
}

function etf(
  symbol: string,
  name: string,
  exchange: "NASDAQ" | "NYSE" | "AMEX",
  sector: string,
  basePrice: number
): AssetUniverseRecord {
  return {
    id: `etf-${symbol}`,
    symbol,
    displaySymbol: symbol,
    name,
    market: "United States",
    category: "etf",
    exchange,
    sector: sector || "ETF",
    industry: "Exchange Traded Fund",
    country: "US",
    currency: "USD",
    provider: "yahoo",
    isActive: true,
    basePrice,
    region: "US",
  };
}

function crypto(symbol: string, name: string, basePrice: number): AssetUniverseRecord {
  return {
    id: `crypto-${symbol}`,
    symbol,
    displaySymbol: symbol,
    name,
    market: "Global Crypto",
    category: "crypto",
    exchange: "Crypto",
    sector: "Digital Assets",
    industry: "Cryptocurrency",
    country: "Global",
    currency: "USD",
    provider: "coingecko",
    isActive: true,
    basePrice,
  };
}

function forex(symbol: string, name: string, basePrice: number): AssetUniverseRecord {
  return {
    id: `forex-${symbol}`,
    symbol,
    displaySymbol: symbol,
    name,
    market: "Global FX",
    category: "forex",
    exchange: "FX",
    sector: "Currencies",
    industry: "Foreign Exchange",
    country: "Global",
    currency: "USD",
    provider: "yahoo",
    isActive: true,
    basePrice,
  };
}

function commodity(
  symbol: string,
  name: string,
  sub: UniverseCategory,
  exchange: string,
  sector: string,
  basePrice: number
): AssetUniverseRecord {
  return {
    id: `${sub}-${symbol}`,
    symbol,
    displaySymbol: symbol,
    name,
    market: "Global Commodities",
    category: sub,
    exchange,
    sector,
    industry: sector,
    country: "Global",
    currency: "USD",
    provider: "yahoo",
    isActive: true,
    basePrice,
  };
}

function index(
  symbol: string,
  name: string,
  exchange: string,
  country: string,
  currency: string,
  basePrice: number,
  region?: "US" | "SA" | "Global"
): AssetUniverseRecord {
  return {
    id: `index-${symbol}`,
    symbol,
    displaySymbol: symbol,
    name,
    market: country,
    category: "index",
    exchange,
    sector: "Index",
    industry: "Market Index",
    country,
    currency,
    provider: "yahoo",
    isActive: true,
    basePrice,
    region,
  };
}

/** Master seed list — single source of truth for Markets tabs. */
export const ASSET_UNIVERSE: AssetUniverseRecord[] = [
  // —— Saudi Stocks (Tadawul) — required + extended ——
  saudi("2222.SR", "Saudi Aramco", "Energy", "Integrated Oil & Gas", 28.5),
  saudi("1120.SR", "Al Rajhi Bank", "Financials", "Banking", 92),
  saudi("1180.SR", "Saudi National Bank (SNB)", "Financials", "Banking", 38),
  saudi("2010.SR", "SABIC", "Materials", "Petrochemicals", 88),
  saudi("7010.SR", "Saudi Telecom (STC)", "Communication", "Telecom", 52),
  saudi("1211.SR", "Maaden", "Materials", "Mining", 58),
  saudi("2020.SR", "SABIC Agri-Nutrients", "Materials", "Fertilizers", 102),
  saudi("2082.SR", "ACWA Power", "Utilities", "Renewable Power", 62),
  saudi("4002.SR", "Mouwasat Medical Services", "Healthcare", "Hospitals", 95),
  saudi("4004.SR", "Dallah Healthcare", "Healthcare", "Hospitals", 118),
  saudi("4005.SR", "Care Medical Services", "Healthcare", "Hospitals", 42),
  saudi("4013.SR", "Dr. Sulaiman Al Habib Medical", "Healthcare", "Hospitals", 285),
  saudi("1020.SR", "Bank AlJazira", "Financials", "Banking", 18),
  saudi("1050.SR", "Banque Saudi Fransi", "Financials", "Banking", 42),
  saudi("1060.SR", "Saudi Awwal Bank (SAB)", "Financials", "Banking", 36),
  saudi("1080.SR", "Arab National Bank", "Financials", "Banking", 22),
  saudi("1150.SR", "Alinma Bank", "Financials", "Banking", 28),
  saudi("2380.SR", "Petro Rabigh", "Energy", "Refining", 14),
  saudi("4030.SR", "Bahri", "Industrials", "Shipping & Logistics", 22),
  saudi("7203.SR", "Elm Company", "Technology", "Software & IT", 78),
  saudi("1010.SR", "Riyad Bank", "Financials", "Banking", 28),
  saudi("2280.SR", "Almarai", "Consumer", "Food & Beverage", 48),

  // —— US Stocks — required minimum ——
  usStock("AAPL", "Apple Inc.", "NASDAQ", "Technology", "Consumer Electronics", 178),
  usStock("MSFT", "Microsoft", "NASDAQ", "Technology", "Software", 415),
  usStock("NVDA", "NVIDIA", "NASDAQ", "Technology", "Semiconductors", 875),
  usStock("AMZN", "Amazon", "NASDAQ", "Consumer", "E-Commerce", 185),
  usStock("GOOGL", "Alphabet", "NASDAQ", "Technology", "Internet Services", 175),
  usStock("META", "Meta Platforms", "NASDAQ", "Technology", "Social Media", 480),
  usStock("TSLA", "Tesla", "NASDAQ", "Consumer", "Automotive", 248),
  usStock("BRK-B", "Berkshire Hathaway", "NYSE", "Financials", "Conglomerate", 420),
  usStock("JPM", "JPMorgan Chase", "NYSE", "Financials", "Banking", 195),
  usStock("V", "Visa", "NYSE", "Financials", "Payments", 280),
  usStock("MA", "Mastercard", "NYSE", "Financials", "Payments", 460),
  usStock("UNH", "UnitedHealth Group", "NYSE", "Healthcare", "Managed Care", 520),
  usStock("XOM", "Exxon Mobil", "NYSE", "Energy", "Integrated Oil", 110),
  usStock("JNJ", "Johnson & Johnson", "NYSE", "Healthcare", "Pharmaceuticals", 155),
  usStock("PG", "Procter & Gamble", "NYSE", "Consumer", "Household Products", 165),
  usStock("HD", "Home Depot", "NYSE", "Consumer", "Retail", 380),
  usStock("COST", "Costco Wholesale", "NASDAQ", "Consumer", "Retail", 720),
  usStock("NFLX", "Netflix", "NASDAQ", "Communication", "Streaming", 620),
  usStock("AMD", "Advanced Micro Devices", "NASDAQ", "Technology", "Semiconductors", 160),
  usStock("AVGO", "Broadcom", "NASDAQ", "Technology", "Semiconductors", 165),

  // —— Global Stocks ——
  globalStock("BP", "BP plc", "LSE", "UK", "GBP", "Energy", "Integrated Oil", 480),
  globalStock("SAP", "SAP SE", "XETRA", "DE", "EUR", "Technology", "Enterprise Software", 180),
  globalStock("TM", "Toyota Motor", "TSE", "JP", "JPY", "Consumer", "Automotive", 2800),
  globalStock("BABA", "Alibaba Group", "NYSE", "CN", "USD", "Consumer", "E-Commerce", 85),
  globalStock("NVO", "Novo Nordisk", "NYSE", "DK", "USD", "Healthcare", "Pharmaceuticals", 135),
  globalStock("ASML", "ASML Holding", "NASDAQ", "NL", "USD", "Technology", "Semiconductor Equipment", 920),
  globalStock("SHEL", "Shell plc", "LSE", "UK", "GBP", "Energy", "Integrated Oil", 2650),

  // —— ETFs — required minimum ——
  etf("SPY", "SPDR S&P 500 ETF", "NYSE", "Broad Market", 520),
  etf("QQQ", "Invesco QQQ Trust", "NASDAQ", "Technology", 440),
  etf("DIA", "SPDR Dow Jones Industrial", "NYSE", "Broad Market", 390),
  etf("IWM", "Russell 2000 ETF", "AMEX", "Small Cap", 210),
  etf("VOO", "Vanguard S&P 500 ETF", "NYSE", "Broad Market", 480),
  etf("VTI", "Vanguard Total Stock Market", "NYSE", "Broad Market", 260),
  etf("GLD", "SPDR Gold Shares", "NYSE", "Commodities", 215),
  etf("SLV", "iShares Silver Trust", "NYSE", "Commodities", 28),
  etf("USO", "United States Oil Fund", "NYSE", "Energy", 72),
  etf("TLT", "iShares 20+ Year Treasury", "NASDAQ", "Fixed Income", 95),

  // —— Crypto — required ——
  crypto("BTCUSD", "Bitcoin / USD", 67000),
  crypto("ETHUSD", "Ethereum / USD", 3500),
  crypto("BNBUSD", "BNB / USD", 580),
  crypto("SOLUSD", "Solana / USD", 145),
  crypto("XRPUSD", "XRP / USD", 0.62),
  crypto("ADAUSD", "Cardano / USD", 0.45),
  crypto("DOGEUSD", "Dogecoin / USD", 0.12),
  crypto("AVAXUSD", "Avalanche / USD", 35),
  crypto("LINKUSD", "Chainlink / USD", 15),
  crypto("MATICUSD", "Polygon / USD", 0.55),

  // —— Forex — required ——
  forex("EURUSD", "EUR / USD", 1.08),
  forex("GBPUSD", "GBP / USD", 1.27),
  forex("USDJPY", "USD / JPY", 157),
  forex("USDCHF", "USD / CHF", 0.88),
  forex("AUDUSD", "AUD / USD", 0.65),
  forex("USDCAD", "USD / CAD", 1.36),
  forex("NZDUSD", "NZD / USD", 0.61),
  forex("EURGBP", "EUR / GBP", 0.85),
  forex("EURJPY", "EUR / JPY", 170),
  forex("GBPJPY", "GBP / JPY", 200),

  // —— Commodities — gold / silver / oil / gas / metals / agriculture ——
  commodity("GCUSD", "Gold", "gold", "COMEX", "Precious Metals", 2350),
  commodity("SIUSD", "Silver", "commodity", "COMEX", "Precious Metals", 28),
  commodity("PLUSD", "Platinum", "commodity", "COMEX", "Precious Metals", 980),
  commodity("CLUSD", "WTI Crude Oil", "oil", "COMEX", "Energy", 78),
  commodity("BZUSD", "Brent Crude Oil", "oil", "COMEX", "Energy", 82),
  commodity("NGUSD", "Natural Gas", "gas", "COMEX", "Energy", 2.8),
  commodity("HGUSD", "Copper", "commodity", "COMEX", "Industrial Metals", 4.2),
  commodity("ZWUSD", "Wheat", "commodity", "CBOT", "Agriculture", 580),
  commodity("ZCUSD", "Corn", "commodity", "CBOT", "Agriculture", 480),
  commodity("SBUSD", "Sugar", "commodity", "ICE", "Agriculture", 21),

  // —— Indices — required ——
  index("SPX", "S&P 500", "NYSE", "US", "USD", 5200, "US"),
  index("NDX", "Nasdaq 100", "NASDAQ", "US", "USD", 18500, "US"),
  index("DJI", "Dow Jones Industrial", "NYSE", "US", "USD", 39000, "US"),
  index("RUT", "Russell 2000", "NYSE", "US", "USD", 2100, "US"),
  index("TASI", "Tadawul All Share (TASI)", "Tadawul", "SA", "SAR", 11800, "SA"),
  index("FTSE", "FTSE 100", "LSE", "UK", "GBP", 7800, "Global"),
  index("DAX", "DAX 40", "XETRA", "DE", "EUR", 18000, "Global"),
  index("N225", "Nikkei 225", "TSE", "JP", "JPY", 38000, "Global"),
  index("HSI", "Hang Seng", "HKEX", "HK", "HKD", 17000, "Global"),
  index("CAC", "CAC 40", "EURONEXT", "FR", "EUR", 7500, "Global"),
];

const SYMBOL_INDEX = new Map(ASSET_UNIVERSE.map((a) => [a.symbol.toUpperCase(), a]));
const DISPLAY_INDEX = new Map(ASSET_UNIVERSE.map((a) => [a.displaySymbol.toUpperCase(), a]));

export function normalizeUniverseSymbol(input: string): string {
  const raw = input.trim().toUpperCase();
  const byDisplay = DISPLAY_INDEX.get(raw);
  if (byDisplay) return byDisplay.symbol;
  const stripped = raw.replace(/\.SR$/i, "");
  return SYMBOL_INDEX.has(stripped) ? stripped : stripped;
}

export function getAssetBySymbol(symbol: string): AssetUniverseRecord | undefined {
  const key = normalizeUniverseSymbol(symbol);
  return SYMBOL_INDEX.get(key);
}

export function getAllActiveAssets(): AssetUniverseRecord[] {
  return ASSET_UNIVERSE.filter((a) => a.isActive);
}

export function getAllActiveSymbols(): string[] {
  return getAllActiveAssets().map((a) => a.symbol);
}

export function universeCategoryToAssetClass(record: AssetUniverseRecord): AssetClass {
  switch (record.category) {
    case "saudi_stock":
      return "saudi";
    case "crypto":
      return "crypto";
    case "forex":
      return "forex";
    case "etf":
      return "etf";
    case "index":
      return "index";
    case "gold":
    case "oil":
    case "gas":
    case "commodity":
      return "commodity";
    default:
      return "stock";
  }
}

export function matchesUniverseCategory(record: AssetUniverseRecord, tab: MarketCategory): boolean {
  if (tab === "all") return true;
  switch (tab) {
    case "saudi":
      return record.category === "saudi_stock";
    case "us":
      return record.category === "us_stock";
    case "global":
      return record.category === "global_stock";
    case "etf":
      return record.category === "etf";
    case "crypto":
      return record.category === "crypto";
    case "forex":
      return record.category === "forex";
    case "commodity":
      return ["commodity", "gold", "oil", "gas"].includes(record.category);
    case "gold":
      return record.category === "gold" || ["GCUSD", "GLD", "SLV"].includes(record.symbol);
    case "oil":
      return record.category === "oil" || ["CLUSD", "BZUSD", "USO"].includes(record.symbol);
    case "index":
      return record.category === "index";
    default:
      return true;
  }
}

export function matchesUniverseSearch(record: AssetUniverseRecord, query: string): boolean {
  const q = query.trim().toUpperCase();
  if (!q) return true;
  return (
    record.symbol.toUpperCase().includes(q) ||
    record.displaySymbol.toUpperCase().includes(q) ||
    record.name.toUpperCase().includes(q) ||
    record.exchange.toUpperCase().includes(q) ||
    record.sector.toUpperCase().includes(q) ||
    record.market.toUpperCase().includes(q)
  );
}

export function getAssetsByMarketTab(tab: MarketCategory, search = ""): AssetUniverseRecord[] {
  return getAllActiveAssets().filter((a) => matchesUniverseCategory(a, tab) && matchesUniverseSearch(a, search));
}

export function toMockUniverseEntry(record: AssetUniverseRecord) {
  return {
    name: record.name,
    assetClass: universeCategoryToAssetClass(record),
    exchange: record.exchange,
    currency: record.currency,
    basePrice: record.basePrice,
    region: record.region,
    displaySymbol: record.displaySymbol,
    sector: record.sector,
    industry: record.industry,
    country: record.country,
    provider: record.provider,
  };
}

export function buildMockUniverseMap(): Record<string, ReturnType<typeof toMockUniverseEntry>> {
  const out: Record<string, ReturnType<typeof toMockUniverseEntry>> = {};
  for (const asset of getAllActiveAssets()) {
    out[asset.symbol] = toMockUniverseEntry(asset);
  }
  return out;
}

export const UNIVERSE_STATS = {
  total: ASSET_UNIVERSE.length,
  saudi: ASSET_UNIVERSE.filter((a) => a.category === "saudi_stock").length,
  us: ASSET_UNIVERSE.filter((a) => a.category === "us_stock").length,
  global: ASSET_UNIVERSE.filter((a) => a.category === "global_stock").length,
  etf: ASSET_UNIVERSE.filter((a) => a.category === "etf").length,
  crypto: ASSET_UNIVERSE.filter((a) => a.category === "crypto").length,
  forex: ASSET_UNIVERSE.filter((a) => a.category === "forex").length,
  commodity: ASSET_UNIVERSE.filter((a) => ["commodity", "gold", "oil", "gas"].includes(a.category)).length,
  index: ASSET_UNIVERSE.filter((a) => a.category === "index").length,
};
