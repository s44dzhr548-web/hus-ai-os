import type { MarketDataProvider } from "./types";
import { coingeckoProvider } from "./providers/coingecko";
import { binanceProvider } from "./providers/binance";
import { finnhubProvider } from "./providers/finnhub";
import { alphaVantageProvider } from "./providers/alpha-vantage";
import { twelveDataProvider } from "./providers/twelve-data";
import { polygonProvider } from "./providers/polygon";
import { yahooProvider } from "./providers/yahoo";
import { forexProvider } from "./providers/forex";
import { tadawulProvider } from "./providers/tadawul";
import { mockProvider } from "./providers/mock";

export const PROVIDER_REGISTRY: MarketDataProvider[] = [
  mockProvider,
  coingeckoProvider,
  binanceProvider,
  yahooProvider,
  finnhubProvider,
  polygonProvider,
  twelveDataProvider,
  alphaVantageProvider,
  forexProvider,
  tadawulProvider,
];

export function getProviderById(id: string): MarketDataProvider | undefined {
  return PROVIDER_REGISTRY.find((p) => p.id === id);
}

export function getConfiguredProviders(): MarketDataProvider[] {
  return PROVIDER_REGISTRY.filter((p) => p.isConfigured());
}
