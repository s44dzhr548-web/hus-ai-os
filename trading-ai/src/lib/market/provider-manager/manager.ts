import type { AssetClass } from "@/types/trading";
import type { MarketDataProvider, MarketDataResult, NormalizedCandle, NormalizedQuote, ProviderId } from "../types";
import { envKey, hasKey, isRealMarketDataMode, KEYED_PROVIDER_ENV, PUBLIC_LIVE_PROVIDERS, PROVIDER_LABELS } from "../config";
import { mockProvider } from "../providers/mock";
import { assetClassForSymbol } from "../catalog";
import { tieredGet, tieredSet, type CacheLayer } from "../cache-enterprise";
import { chainForAssetClass, type ProviderChainEntry } from "./chains";
import { trackApiCall, trackProviderError } from "./cost";
import { getProviderConfig, isAutomaticSwitchingEnabled, recordFailover } from "./config-store";
import { buildRuntimeHealth, inferDataStatus, recordProviderFailure, recordProviderSuccess } from "./health";
import { logEnterprise } from "./logging";
import { getActivePriorityStrategy, selectProviderByStrategy } from "./priority";
import { resolveImplementation } from "./resolver";
import { collectValidationQuotes, validateQuotePrices } from "./validation";

export interface ExtendedMarketDataResult<T> extends MarketDataResult<T> {
  dataStatus: import("./health").PriceDataStatus;
  latencyMs: number;
  cacheHit: boolean;
  cacheLayer?: CacheLayer;
  activeProvider: string;
  backupProvider?: string;
  validationWarning?: string;
  providerCount: number;
  aiConfidenceAdjustment: number;
}

function isEntryAvailable(entry: ProviderChainEntry): boolean {
  const config = getProviderConfig(entry.id, entry.envKey);
  if (!config.enabled) return false;
  if (entry.envKey && !envKey(entry.envKey) && !entry.delegateTo) {
    if (!PUBLIC_LIVE_PROVIDERS.includes(entry.id)) return false;
  }
  const impl = resolveImplementation(entry.id, entry.delegateTo);
  if (!impl) return false;
  if (!PUBLIC_LIVE_PROVIDERS.includes(impl.id) && !impl.isConfigured()) return false;
  return true;
}

function orderedChain(assetClass: AssetClass): ProviderChainEntry[] {
  const chain = chainForAssetClass(assetClass);
  const strategy = getActivePriorityStrategy();
  const withHealth = chain.map((entry) => {
    const config = getProviderConfig(entry.id, entry.envKey);
    const health = buildRuntimeHealth(entry.id, entry.labelEn, {
      hasApiKey: entry.envKey ? Boolean(envKey(entry.envKey)) : true,
      enabled: config.enabled,
      isActive: false,
      isBackup: entry.role !== "primary",
      automaticSwitching: isAutomaticSwitchingEnabled(),
      monthlyCostUsd: 0,
      quotaRemaining: config.hasApiKey ? undefined : 0,
    });
    return { entry, health, available: isEntryAvailable(entry) };
  });
  const best = selectProviderByStrategy(withHealth, strategy);
  if (!best) return chain;
  const rest = chain.filter((e) => e.id !== best.id || e.role !== best.role);
  return [best, ...rest.filter((e) => !(e.id === best.id && e.role === best.role))];
}

async function fetchWithChain<T>(
  symbol: string,
  assetClass: AssetClass,
  fn: (provider: MarketDataProvider) => Promise<T | null>,
  cacheKey: string,
  cacheTtlMs: number
): Promise<ExtendedMarketDataResult<T>> {
  if (!isRealMarketDataMode()) {
    const mock = await fn(mockProvider);
    return wrapResult(mock!, "mock", true, 0, false, undefined, "mock", undefined, 0, 0);
  }

  const cached = await tieredGet<T>(cacheKey);
  if (cached.hit && cached.value != null) {
    logEnterprise({ type: "cache_hit", symbol, message: `Cache hit ${cacheKey}`, metadata: { layer: cached.layer ?? "memory" } });
    return wrapResult(cached.value, "yahoo", false, 0, true, cached.layer, "cached", undefined, 1, 0);
  }
  logEnterprise({ type: "cache_miss", symbol, message: `Cache miss ${cacheKey}` });

  const chain = orderedChain(assetClass);
  let lastReason = "No provider available";
  let previousProvider = chain[0]?.labelEn ?? "none";
  const validationQuotes: { source: string; quote: NormalizedQuote }[] = [];

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    if (!isEntryAvailable(entry)) continue;
    const impl = resolveImplementation(entry.id, entry.delegateTo);
    if (!impl) continue;

    const config = getProviderConfig(entry.id, entry.envKey);
    if (!config.fallbackEnabled && i > 0) continue;

    const start = Date.now();
    try {
      const data = await fn(impl);
      const latencyMs = Date.now() - start;
      if (data) {
        trackApiCall(entry.id, entry.costPerCallUsd, entry.monthlyFreeQuota);
        recordProviderSuccess(entry.id, latencyMs);
        logEnterprise({
          type: "api_call",
          providerId: entry.id,
          symbol,
          latencyMs,
          message: `${entry.labelEn} success`,
        });

        if (i > 0 && isAutomaticSwitchingEnabled()) {
          recordFailover(symbol, previousProvider, entry.labelEn, lastReason);
        }

        const quoteCandidate = data as unknown as NormalizedQuote;
        if (!Array.isArray(data) && typeof quoteCandidate.price === "number") {
          validationQuotes.push({ source: entry.id, quote: quoteCandidate });
        }

        await tieredSet(cacheKey, data, cacheTtlMs);

        const backup = chain[i + 1]?.labelEn;
        const isDemo =
          impl.id === "mock" ||
          (Array.isArray(data) ? (data[0] as { isDemoData?: boolean })?.isDemoData : (data as { isDemoData?: boolean }).isDemoData) === true;

        const validation = validateQuotePrices(validationQuotes);
        return wrapResult(
          data,
          entry.id,
          isDemo,
          latencyMs,
          false,
          undefined,
          entry.labelEn,
          backup,
          validation.providerCount,
          validation.confidenceAdjustment,
          validation.warningEn
        );
      }
    } catch (e) {
      trackProviderError(entry.id);
      recordProviderFailure(entry.id, `${entry.id} failed: ${e instanceof Error ? e.message : "unknown"}`);
      lastReason = `${entry.labelEn} failed`;
      previousProvider = entry.labelEn;
    }
  }

  const mock = await fn(mockProvider);
  return wrapResult(mock!, "mock", true, 0, false, undefined, "mock", chain[0]?.labelEn, 0, -0.1, lastReason);
}

function wrapResult<T>(
  data: T,
  source: ProviderId,
  isDemoData: boolean,
  latencyMs: number,
  cacheHit: boolean,
  cacheLayer: CacheLayer | undefined,
  activeProvider: string,
  backupProvider: string | undefined,
  providerCount: number,
  aiConfidenceAdjustment: number,
  validationWarning?: string
): ExtendedMarketDataResult<T> {
  const dataStatus = inferDataStatus({ isDemoData, cacheHit, cacheLayer, source });
  return {
    data,
    source,
    isDemoData,
    fallbackReason: isDemoData ? validationWarning : undefined,
    dataStatus,
    latencyMs,
    cacheHit,
    cacheLayer,
    activeProvider,
    backupProvider,
    validationWarning,
    providerCount,
    aiConfidenceAdjustment,
  };
}

export async function managedQuote(symbol: string): Promise<ExtendedMarketDataResult<NormalizedQuote>> {
  const assetClass = assetClassForSymbol(symbol);
  return fetchWithChain(
    symbol,
    assetClass,
    (p) => p.getQuote(symbol),
    `quote:${symbol}`,
    30_000
  );
}

export async function managedCandles(
  symbol: string,
  timeframe = "1Day",
  limit = 90
): Promise<ExtendedMarketDataResult<NormalizedCandle[]>> {
  const assetClass = assetClassForSymbol(symbol);
  return fetchWithChain(
    symbol,
    assetClass,
    (p) => p.getCandles(symbol, timeframe, limit),
    `candles:${symbol}:${timeframe}:${limit}`,
    120_000
  );
}

export async function getEnterpriseProviderDashboard() {
  const strategy = getActivePriorityStrategy();
  const categories = ["saudi", "us_stock", "crypto", "forex", "index", "commodity"] as const;
  const activeByMarket: Record<string, string> = {};

  for (const cat of categories) {
    const chain = chainForAssetClass(cat === "us_stock" ? "stock" : cat === "index" ? "index" : cat);
    const first = chain.find((e) => isEntryAvailable(e));
    activeByMarket[cat] = first?.labelEn ?? "mock";
  }

  const providers = (Object.keys(PROVIDER_LABELS) as ProviderId[]).map((id) => {
    const envName = KEYED_PROVIDER_ENV[id];
    const hasApiKey = PUBLIC_LIVE_PROVIDERS.includes(id) || (envName ? hasKey(envName) : id === "mock");
    const isActive = Object.values(activeByMarket).some((a) => a.includes(PROVIDER_LABELS[id].split(" ")[0]));
    return buildRuntimeHealth(id, PROVIDER_LABELS[id], {
      hasApiKey,
      enabled: getProviderConfig(id, envName).enabled,
      isActive,
      isBackup: !isActive,
      automaticSwitching: isAutomaticSwitchingEnabled(),
      monthlyCostUsd: 0,
    });
  });

  return {
    strategy,
    automaticSwitching: isAutomaticSwitchingEnabled(),
    activeByMarket,
    providers,
    failoverEvents: (await import("./config-store")).getFailoverEvents(20),
  };
}

export { collectValidationQuotes, validateQuotePrices };
