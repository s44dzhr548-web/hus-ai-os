import type { EconomicEvent, NewsImpact } from "@/types/trading";
import { hashSymbol, seededRandom } from "./seed";

const NEWS_TEMPLATES = [
  { headline: "{sym} beats earnings expectations", sentiment: "positive" as const },
  { headline: "Analysts upgrade {sym} price target", sentiment: "positive" as const },
  { headline: "Sector rotation impacts {sym}", sentiment: "neutral" as const },
  { headline: "Regulatory review announced for {sym}", sentiment: "negative" as const },
  { headline: "{sym} expands into new markets", sentiment: "positive" as const },
];

export function getMockNews(symbol: string): NewsImpact[] {
  const rand = seededRandom(symbol + "-news");
  return NEWS_TEMPLATES.slice(0, 3 + Math.floor(rand() * 2)).map((t, i) => ({
    headline: t.headline.replace("{sym}", symbol),
    sentiment: t.sentiment,
    impactScore: Number((0.3 + rand() * 0.7).toFixed(2)),
    source: ["Reuters", "Bloomberg", "CNBC", "Argaam"][i % 4],
    publishedAt: new Date(Date.now() - i * 3600000 * 6).toISOString(),
  }));
}

export function getMockEconomicEvents(): EconomicEvent[] {
  const now = new Date();
  return [
    {
      title: "FOMC Interest Rate Decision",
      category: "rates",
      impact: "high",
      date: new Date(now.getTime() + 86400000 * 3).toISOString(),
      description: "Federal Reserve policy announcement — high volatility expected in USD pairs and equities.",
    },
    {
      title: "OPEC+ Production Meeting",
      category: "oil",
      impact: "high",
      date: new Date(now.getTime() + 86400000 * 5).toISOString(),
      description: "Oil supply decisions impact energy stocks and Saudi market sentiment.",
    },
    {
      title: "US Non-Farm Payrolls",
      category: "employment",
      impact: "medium",
      date: new Date(now.getTime() + 86400000 * 7).toISOString(),
      description: "Employment data affects Fed expectations and broad market direction.",
    },
    {
      title: "CPI Inflation Report",
      category: "inflation",
      impact: "high",
      date: new Date(now.getTime() + 86400000 * 10).toISOString(),
      description: "Inflation print drives rate expectations and risk asset pricing.",
    },
  ];
}

export function getSectorForSymbol(symbol: string): string {
  const sectors: Record<string, string> = {
    AAPL: "Technology",
    MSFT: "Technology",
    GOOGL: "Technology",
    NVDA: "Semiconductors",
    TSLA: "Automotive",
    SPY: "Broad Market",
    BTCUSD: "Digital Assets",
    ETHUSD: "Digital Assets",
    EURUSD: "Currencies",
    GBPUSD: "Currencies",
    USDJPY: "Currencies",
    "2222": "Energy",
    "1120": "Financials",
    "2010": "Materials",
  };
  return sectors[symbol] ?? "General";
}

export function getSectorImpact(symbol: string): { sector: string; impact: number; summary: string } {
  const sector = getSectorForSymbol(symbol);
  const impact = ((hashSymbol(symbol + sector) % 100) - 50) / 100;
  const direction = impact > 0.1 ? "outperforming" : impact < -0.1 ? "underperforming" : "in line with";
  return {
    sector,
    impact: Number(impact.toFixed(2)),
    summary: `${sector} sector is ${direction} the broader market this week.`,
  };
}
