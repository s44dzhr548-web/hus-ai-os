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
  // —— Saudi Stocks (Tadawul) ——
  saudi("2222.SR", "Saudi Aramco", "Energy", "Integrated Oil & Gas", 28.5),
  saudi("1120.SR", "Al Rajhi Bank", "Financials", "Banking", 92),
  saudi("1180.SR", "Saudi National Bank (SNB)", "Financials", "Banking", 38),
  saudi("2010.SR", "SABIC", "Materials", "Petrochemicals", 88),
  saudi("7010.SR", "Saudi Telecom (STC)", "Communication", "Telecom", 52),
  saudi("1211.SR", "Maaden", "Materials", "Mining", 58),
  saudi("2020.SR", "SABIC Agri-Nutrients", "Materials", "Fertilizers", 102),
  saudi("2082.SR", "ACWA Power", "Utilities", "Renewable Power", 62),
  saudi("1010.SR", "Riyad Bank", "Financials", "Banking", 28),
  saudi("4030.SR", "Bahri", "Industrials", "Shipping & Logistics", 22),
  saudi("2280.SR", "Almarai", "Consumer", "Food & Beverage", 48),
  saudi("2350.SR", "Saudi Kayan", "Materials", "Petrochemicals", 8.5),

  // —— US Stocks ——
  usStock("AAPL", "Apple Inc.", "NASDAQ", "Technology", "Consumer Electronics", 178),
  usStock("MSFT", "Microsoft", "NASDAQ", "Technology", "Software", 415),
  usStock("GOOGL", "Alphabet", "NASDAQ", "Technology", "Internet Services", 175),
  usStock("AMZN", "Amazon", "NASDAQ", "Consumer", "E-Commerce", 185),
  usStock("META", "Meta Platforms", "NASDAQ", "Technology", "Social Media", 480),
  usStock("NVDA", "NVIDIA", "NASDAQ", "Technology", "Semiconductors", 875),
  usStock("TSLA", "Tesla", "NASDAQ", "Consumer", "Automotive", 248),
  usStock("JPM", "JPMorgan Chase", "NYSE", "Financials", "Banking", 195),
  usStock("KO", "Coca-Cola", "NYSE", "Consumer", "Beverages", 62),
  usStock("XOM", "Exxon Mobil", "NYSE", "Energy", "Integrated Oil", 110),
  usStock("V", "Visa", "NYSE", "Financials", "Payments", 280),
  usStock("MA", "Mastercard", "NYSE", "Financials", "Payments", 460),
  usStock("WMT", "Walmart", "NYSE", "Consumer", "Retail", 165),
  usStock("DIS", "Walt Disney", "NYSE", "Communication", "Entertainment", 95),
  usStock("NFLX", "Netflix", "NASDAQ", "Communication", "Streaming", 620),
  usStock("AMD", "Advanced Micro Devices", "NASDAQ", "Technology", "Semiconductors", 160),
  usStock("INTC", "Intel", "NASDAQ", "Technology", "Semiconductors", 42),
  usStock("BAC", "Bank of America", "NYSE", "Financials", "Banking", 38),
  usStock("PFE", "Pfizer", "NYSE", "Healthcare", "Pharmaceuticals", 28),
  usStock("CVX", "Chevron", "NYSE", "Energy", "Integrated Oil", 155),

  // —— Global Stocks ——
  globalStock("BP", "BP plc", "LSE", "UK", "GBP", "Energy", "Integrated Oil", 480),
  globalStock("SAP", "SAP SE", "XETRA", "DE", "EUR", "Technology", "Enterprise Software", 180),
  globalStock("TM", "Toyota Motor", "TSE", "JP", "JPY", "Consumer", "Automotive", 2800),
  globalStock("BABA", "Alibaba Group", "NYSE", "CN", "USD", "Consumer", "E-Commerce", 85),
  globalStock("NVO", "Novo Nordisk", "NYSE", "DK", "USD", "Healthcare", "Pharmaceuticals", 135),
  globalStock("ASML", "ASML Holding", "NASDAQ", "NL", "USD", "Technology", "Semiconductor Equipment", 920),
  globalStock("HSBA", "HSBC Holdings", "LSE", "UK", "GBP", "Financials", "Banking", 620),
  globalStock("SHEL", "Shell plc", "LSE", "UK", "GBP", "Energy", "Integrated Oil", 2650),

  // —— ETFs ——
  etf("SPY", "SPDR S&P 500 ETF", "NYSE", "Broad Market", 520),
  etf("QQQ", "Invesco QQQ Trust", "NASDAQ", "Technology", 440),
  etf("IWM", "Russell 2000 ETF", "AMEX", "Small Cap", 210),
  etf("VTI", "Vanguard Total Stock Market", "NYSE", "Broad Market", 260),
  etf("EEM", "iShares MSCI Emerging Markets", "NYSE", "Emerging Markets", 42),
  etf("GLD", "SPDR Gold Shares", "NYSE", "Commodities", 215),
  etf("GLDM", "SPDR Gold MiniShares", "NYSE", "Commodities", 42),
  etf("XLE", "Energy Select Sector SPDR", "NYSE", "Energy", 92),
  etf("USO", "United States Oil Fund", "NYSE", "Energy", 72),
  etf("BNO", "United States Brent Oil", "NYSE", "Energy", 28),
  etf("XLF", "Financial Select Sector SPDR", "NYSE", "Financials", 42),
  etf("ARKK", "ARK Innovation ETF", "NYSE", "Thematic", 48),

  // —— Crypto ——
  crypto("BTCUSD", "Bitcoin", 67000),
  crypto("ETHUSD", "Ethereum", 3500),
  crypto("SOLUSD", "Solana", 145),
  crypto("BNBUSD", "BNB", 580),
  crypto("XRPUSD", "XRP", 0.62),
  crypto("ADAUSD", "Cardano", 0.45),
  crypto("DOGEUSD", "Dogecoin", 0.12),
  crypto("AVAXUSD", "Avalanche", 35),

  // —— Forex ——
  forex("EURUSD", "Euro / US Dollar", 1.08),
  forex("GBPUSD", "British Pound / USD", 1.27),
  forex("USDJPY", "USD / Japanese Yen", 157),
  forex("AUDUSD", "Australian Dollar / USD", 0.65),
  forex("USDCAD", "USD / Canadian Dollar", 1.36),
  forex("USDCHF", "USD / Swiss Franc", 0.88),

  // —— Commodities (gold / oil / silver / gas) ——
  commodity("GCUSD", "Gold Spot", "gold", "COMEX", "Precious Metals", 2350),
  commodity("SIUSD", "Silver Spot", "commodity", "COMEX", "Precious Metals", 28),
  commodity("CLUSD", "Crude Oil WTI", "oil", "COMEX", "Energy", 78),
  commodity("NGUSD", "Natural Gas", "gas", "COMEX", "Energy", 2.8),
  commodity("HGUSD", "Copper", "commodity", "COMEX", "Industrial Metals", 4.2),

  // —— Indices ——
  index("SPX", "S&P 500 Index", "NYSE", "US", "USD", 5200, "US"),
  index("DJI", "Dow Jones Industrial", "NYSE", "US", "USD", 39000, "US"),
  index("IXIC", "NASDAQ Composite", "NASDAQ", "US", "USD", 16500, "US"),
  index("RUT", "Russell 2000 Index", "NYSE", "US", "USD", 2100, "US"),
  index("TASI", "Tadawul All Share Index", "Tadawul", "SA", "SAR", 11800, "SA"),
  index("VIX", "CBOE Volatility Index", "CBOE", "US", "USD", 18, "US"),
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
      return record.category === "gold" || record.symbol === "GLD" || record.symbol === "GLDM";
    case "oil":
      return record.category === "oil" || ["USO", "BNO", "XLE", "CLUSD"].includes(record.symbol);
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
