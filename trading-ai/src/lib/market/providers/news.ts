import type { NewsImpact, EconomicEvent } from "@/types/trading";
import { envKey, hasKey } from "../config";
import { fetchJson } from "../fetch";
import { getMockEconomicEvents, getMockNews } from "@/lib/data/mock-news";
import { fetchYahooNewsHeadlines } from "./yahoo";

type NewsApiArticle = { title: string; source: { name: string }; publishedAt: string; description?: string };

type FairEconomyEvent = {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast?: string;
  previous?: string;
};

function sentimentFromTitle(title: string): NewsImpact["sentiment"] {
  if (/surge|rally|gain|beat|rise|up/i.test(title)) return "positive";
  if (/fall|drop|miss|cut|down|slump/i.test(title)) return "negative";
  return "neutral";
}

export async function fetchNews(symbol: string): Promise<{ items: NewsImpact[]; isDemoData: boolean; source: string }> {
  const key = envKey("NEWS_API_KEY");
  if (key) {
    const data = await fetchJson<{ articles?: NewsApiArticle[] }>(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(symbol)}&sortBy=publishedAt&pageSize=5&apiKey=${key}`,
      { cacheKey: `newsapi-${symbol}`, cacheTtlMs: 300_000, rateLimitProvider: "news" }
    );
    if (data?.articles?.length) {
      return {
        items: data.articles.map((a) => ({
          headline: a.title,
          sentiment: sentimentFromTitle(a.title),
          impactScore: 0.5,
          source: a.source.name,
          publishedAt: a.publishedAt,
        })),
        isDemoData: false,
        source: "news_api",
      };
    }
  }

  const yahooHeadlines = await fetchYahooNewsHeadlines(symbol);
  if (yahooHeadlines.length) {
    return {
      items: yahooHeadlines.map((h) => ({
        headline: h.title,
        sentiment: sentimentFromTitle(h.title),
        impactScore: 0.5,
        source: "Yahoo Finance",
        publishedAt: h.publishedAt,
      })),
      isDemoData: false,
      source: "yahoo_news",
    };
  }

  return { items: getMockNews(symbol), isDemoData: true, source: "mock" };
}

export async function fetchEconomicCalendar(): Promise<{
  events: EconomicEvent[];
  isDemoData: boolean;
  source: string;
}> {
  const key = envKey("ECONOMIC_CALENDAR_API_KEY") ?? envKey("TRADING_ECONOMICS_API_KEY");
  if (key) {
    const data = await fetchJson<{ data?: { event: string; country: string; date: string; impact: string }[] }>(
      `https://api.tradingeconomics.com/calendar?c=${key}&format=json`,
      { cacheKey: "econ-te", cacheTtlMs: 600_000 }
    );
    if (data?.data?.length) {
      return {
        events: data.data.slice(0, 8).map((e) => ({
          title: e.event,
          category: "other" as const,
          impact: e.impact === "High" ? ("high" as const) : ("medium" as const),
          date: e.date,
          description: e.country,
        })),
        isDemoData: false,
        source: "economic_calendar",
      };
    }
  }

  const free = await fetchJson<FairEconomyEvent[]>(
    "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
    { cacheKey: "econ-faireconomy", cacheTtlMs: 3600_000, rateLimitProvider: "economic_calendar" }
  );
  if (free?.length) {
    return {
      events: free.slice(0, 10).map((e) => ({
        title: e.title,
        category: e.title.match(/rate|fed|ecb|interest/i) ? ("rates" as const) : e.title.match(/oil|crude/i) ? ("oil" as const) : "other",
        impact: e.impact === "High" ? ("high" as const) : e.impact === "Medium" ? ("medium" as const) : ("low" as const),
        date: e.date,
        description: `${e.country}${e.forecast ? ` · forecast ${e.forecast}` : ""}`,
      })),
      isDemoData: false,
      source: "faireconomy",
    };
  }

  return { events: getMockEconomicEvents(), isDemoData: true, source: "mock" };
}

export function isNewsConfigured(): boolean {
  return hasKey("NEWS_API_KEY");
}

export function isEconomicCalendarConfigured(): boolean {
  return hasKey("ECONOMIC_CALENDAR_API_KEY");
}

export function isLiveNewsAvailable(): boolean {
  return isNewsConfigured();
}

export function isLiveCalendarAvailable(): boolean {
  return isEconomicCalendarConfigured();
}
