import type { ProviderId } from "../types";
import { logEnterprise } from "./logging";

export interface ProviderCostMetrics {
  providerId: ProviderId;
  apiCalls: number;
  errors: number;
  estimatedCostUsd: number;
  remainingQuota?: number;
  monthlyFreeQuota?: number;
}

export interface CostDashboard {
  currentMonthCostUsd: number;
  estimatedEndOfMonthUsd: number;
  totalApiCalls: number;
  byProvider: ProviderCostMetrics[];
  tiers: {
    id: string;
    labelEn: string;
    labelAr: string;
    estimatedMonthlyUsd: number;
    descriptionEn: string;
    descriptionAr: string;
  }[];
}

const metrics = new Map<ProviderId, ProviderCostMetrics>();
const monthKey = () => new Date().toISOString().slice(0, 7);

let currentMonth = monthKey();

function resetIfNewMonth() {
  const key = monthKey();
  if (key !== currentMonth) {
    metrics.clear();
    currentMonth = key;
  }
}

export function trackApiCall(providerId: ProviderId, costPerCallUsd: number, monthlyFreeQuota?: number) {
  resetIfNewMonth();
  const existing = metrics.get(providerId) ?? {
    providerId,
    apiCalls: 0,
    errors: 0,
    estimatedCostUsd: 0,
    monthlyFreeQuota,
  };
  existing.apiCalls += 1;
  const billable = monthlyFreeQuota ? Math.max(0, existing.apiCalls - monthlyFreeQuota) : existing.apiCalls;
  existing.estimatedCostUsd = Number((billable * costPerCallUsd).toFixed(4));
  if (monthlyFreeQuota) existing.remainingQuota = Math.max(0, monthlyFreeQuota - existing.apiCalls);
  metrics.set(providerId, existing);
  return existing;
}

export function trackProviderError(providerId: ProviderId) {
  resetIfNewMonth();
  const existing = metrics.get(providerId) ?? { providerId, apiCalls: 0, errors: 0, estimatedCostUsd: 0 };
  existing.errors += 1;
  metrics.set(providerId, existing);
  logEnterprise({ type: "error", providerId, message: `Provider error count: ${existing.errors}` });
}

export function getCostDashboard(): CostDashboard {
  resetIfNewMonth();
  const byProvider = [...metrics.values()];
  const currentMonthCostUsd = byProvider.reduce((s, p) => s + p.estimatedCostUsd, 0);
  const totalApiCalls = byProvider.reduce((s, p) => s + p.apiCalls, 0);
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const estimatedEndOfMonthUsd = Number(((currentMonthCostUsd / Math.max(dayOfMonth, 1)) * daysInMonth).toFixed(2));

  return {
    currentMonthCostUsd: Number(currentMonthCostUsd.toFixed(2)),
    estimatedEndOfMonthUsd,
    totalApiCalls,
    byProvider,
    tiers: [
      { id: "free", labelEn: "Free Providers", labelAr: "مزودون مجانيون", estimatedMonthlyUsd: 0, descriptionEn: "Yahoo, CoinGecko, Binance, Frankfurter public tiers", descriptionAr: "Yahoo وCoinGecko وBinance وFrankfurter" },
      { id: "starter", labelEn: "Starter", labelAr: "مبتدئ", estimatedMonthlyUsd: 29, descriptionEn: "Finnhub + NewsAPI free tiers", descriptionAr: "Finnhub + NewsAPI" },
      { id: "growth", labelEn: "Growth", labelAr: "نمو", estimatedMonthlyUsd: 99, descriptionEn: "Polygon + Twelve Data starter", descriptionAr: "Polygon + Twelve Data" },
      { id: "professional", labelEn: "Professional", labelAr: "احترافي", estimatedMonthlyUsd: 299, descriptionEn: "Full US + crypto + forex keys", descriptionAr: "مفاتيح US + crypto + forex كاملة" },
      { id: "enterprise", labelEn: "Enterprise", labelAr: "مؤسسي", estimatedMonthlyUsd: 999, descriptionEn: "Licensed Tadawul + Refinitiv + Trading Economics", descriptionAr: "تداول مرخص + Refinitiv + Trading Economics" },
    ],
  };
}
