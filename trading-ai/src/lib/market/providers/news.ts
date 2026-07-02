import type { NewsImpact, EconomicEvent } from "@/types/trading";
import { envKey, hasKey } from "../config";
import { fetchJson } from "../fetch";
import { getMockEconomicEvents, getMockNews } from "@/lib/data/mock-news";

type NewsApiArticle = { title: string; source: { name: string }; publishedAt: string; description?: string };

export async function fetchNews(symbol: string): Promise<{ items: NewsImpact[]; isDemoData: boolean; source: string }> {
  const key = envKey("NEWS_API_KEY");
  if (!key) {
    return { items: getMockNews(symbol), isDemoData: true, source: "mock" };
  }
  const data = await fetchJson<{ articles?: NewsApiArticle[] }>(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(symbol)}&sortBy=publishedAt&pageSize=5&apiKey=${key}`
  );
  if (!data?.articles?.length) {
    return { items: getMockNews(symbol), isDemoData: true, source: "mock", };
  }
  return {
    items: data.articles.map((a) => ({
      headline: a.title,
      sentiment: a.title.match(/surge|rally|gain|beat/i)
        ? ("positive" as const)
        : a.title.match(/fall|drop|miss|cut/i)
          ? ("negative" as const)
          : ("neutral" as const),
      impactScore: 0.5,
      source: a.source.name,
      publishedAt: a.publishedAt,
    })),
    isDemoData: false,
    source: "news_api",
  };
}

export async function fetchEconomicCalendar(): Promise<{
  events: EconomicEvent[];
  isDemoData: boolean;
  source: string;
}> {
  const key = envKey("ECONOMIC_CALENDAR_API_KEY");
  if (!key) {
    return { events: getMockEconomicEvents(), isDemoData: true, source: "mock" };
  }
  const data = await fetchJson<{ data?: { event: string; country: string; date: string; impact: string }[] }>(
    `https://api.tradingeconomics.com/calendar?c=${key}&format=json`
  );
  if (!data?.data?.length) {
    return { events: getMockEconomicEvents(), isDemoData: true, source: "mock" };
  }
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

export function isNewsConfigured(): boolean {
  return hasKey("NEWS_API_KEY");
}

export function isEconomicCalendarConfigured(): boolean {
  return hasKey("ECONOMIC_CALENDAR_API_KEY");
}
