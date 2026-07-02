import type { PaperOrder, PaperPortfolio } from "@/types/trading";
import { DEFAULT_RISK_SETTINGS } from "@/lib/compliance/config";
import { validatePaperTrade } from "@/lib/risk/guardian";
import { runGuardianProAssessment } from "@/lib/risk/guardian-pro";
import { unifiedQuote } from "@/lib/market/unified";
import { getPaperPortfolio, placePaperOrder } from "./portfolio";
import { onPaperTradeFilled } from "./trade-hooks";

export async function executeGuardedPaperOrder(
  symbol: string,
  side: "buy" | "sell",
  quantity: number,
  opts?: { useGuardianPro?: boolean; aiRecommendation?: "buy" | "hold" | "sell" }
): Promise<{ ok: boolean; order?: PaperOrder; error?: string; portfolio: PaperPortfolio; guardianBlocked?: boolean }> {
  const portfolio = await getPaperPortfolio();
  const quote = await unifiedQuote(symbol);
  const price = quote.data.price;
  const check = validatePaperTrade(symbol, side, quantity, portfolio, price, DEFAULT_RISK_SETTINGS);
  if (!check.allowed) {
    return { ok: false, error: check.reasons.join("; "), portfolio, guardianBlocked: true };
  }

  if (opts?.useGuardianPro !== false) {
    const pro = runGuardianProAssessment(symbol, side, quantity, portfolio, price, DEFAULT_RISK_SETTINGS);
    if (!pro.allowed) {
      return { ok: false, error: pro.summaryEn, portfolio, guardianBlocked: true };
    }
  }

  const result = await placePaperOrder(symbol, side, quantity);
  if (result.ok && result.order) {
    onPaperTradeFilled(result.order, opts?.aiRecommendation ?? "hold");
  }
  return { ...result, guardianBlocked: false };
}
