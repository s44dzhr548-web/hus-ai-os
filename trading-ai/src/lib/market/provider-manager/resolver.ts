import type { MarketDataProvider, ProviderId } from "../types";
import { coingeckoProvider } from "../providers/coingecko";
import { binanceProvider } from "../providers/binance";
import { yahooProvider } from "../providers/yahoo";
import { frankfurterProvider } from "../providers/frankfurter";
import { finnhubProvider } from "../providers/finnhub";
import { polygonProvider } from "../providers/polygon";
import { twelveDataProvider } from "../providers/twelve-data";
import { alphaVantageProvider } from "../providers/alpha-vantage";
import { forexProvider } from "../providers/forex";
import { tadawulProvider } from "../providers/tadawul";
import { mockProvider } from "../providers/mock";

const PROVIDER_MAP: Record<ProviderId, MarketDataProvider | null> = {
  coingecko: coingeckoProvider,
  binance: binanceProvider,
  yahoo: yahooProvider,
  frankfurter: frankfurterProvider,
  finnhub: finnhubProvider,
  polygon: polygonProvider,
  twelve_data: twelveDataProvider,
  alpha_vantage: alphaVantageProvider,
  forex: forexProvider,
  tadawul: tadawulProvider,
  mock: mockProvider,
  news: null,
  economic_calendar: null,
};

export function resolveProvider(id: ProviderId): MarketDataProvider | null {
  return PROVIDER_MAP[id];
}

export function resolveImplementation(entryId: ProviderId, delegateTo?: ProviderId): MarketDataProvider | null {
  return resolveProvider(delegateTo ?? entryId);
}

export { PROVIDER_MAP };
