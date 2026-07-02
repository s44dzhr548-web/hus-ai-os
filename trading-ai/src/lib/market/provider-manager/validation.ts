import type { NormalizedQuote } from "../types";
import { logEnterprise } from "./logging";

export interface ValidationResult {
  valid: boolean;
  providerCount: number;
  maxDiffPct: number;
  thresholdPct: number;
  warningEn?: string;
  warningAr?: string;
  confidenceAdjustment: number;
}

const DEFAULT_THRESHOLD_PCT = Number(process.env.PRICE_VALIDATION_THRESHOLD_PCT ?? 2);

export function validateQuotePrices(
  quotes: { source: string; quote: NormalizedQuote }[],
  thresholdPct = DEFAULT_THRESHOLD_PCT
): ValidationResult {
  if (quotes.length < 2) {
    return { valid: true, providerCount: quotes.length, maxDiffPct: 0, thresholdPct, confidenceAdjustment: 0 };
  }

  const prices = quotes.map((q) => q.quote.price).filter((p) => p > 0);
  if (prices.length < 2) {
    return { valid: true, providerCount: quotes.length, maxDiffPct: 0, thresholdPct, confidenceAdjustment: 0 };
  }

  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const maxDiffPct = Math.max(...prices.map((p) => (Math.abs(p - avg) / avg) * 100));

  if (maxDiffPct > thresholdPct) {
    const warningEn = `Price divergence ${maxDiffPct.toFixed(2)}% across ${quotes.length} providers — possible data issue`;
    const warningAr = `فرق سعر ${maxDiffPct.toFixed(2)}% بين ${quotes.length} مزودين — احتمال مشكلة بيانات`;
    logEnterprise({
      type: "validation_warning",
      message: warningEn,
      metadata: { maxDiffPct, thresholdPct, providerCount: quotes.length },
    });
    return {
      valid: false,
      providerCount: quotes.length,
      maxDiffPct,
      thresholdPct,
      warningEn,
      warningAr,
      confidenceAdjustment: -0.15,
    };
  }

  return { valid: true, providerCount: quotes.length, maxDiffPct, thresholdPct, confidenceAdjustment: 0.05 };
}

export async function collectValidationQuotes(
  symbol: string,
  fetchers: { id: string; fn: () => Promise<NormalizedQuote | null> }[]
): Promise<{ source: string; quote: NormalizedQuote }[]> {
  const results = await Promise.all(
    fetchers.map(async ({ id, fn }) => {
      try {
        const quote = await fn();
        return quote ? { source: id, quote } : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is { source: string; quote: NormalizedQuote } => r != null);
}
