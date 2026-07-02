import type { PaperOrder, PaperPortfolio, PaperPosition, Recommendation } from "@/types/trading";
import { unifiedQuote } from "@/lib/market/unified";

const INITIAL_CASH = 100_000;

let portfolio: PaperPortfolio = {
  cash: INITIAL_CASH,
  initialCash: INITIAL_CASH,
  equity: INITIAL_CASH,
  totalPnl: 0,
  totalPnlPct: 0,
  openPositions: [],
  closedPositions: [],
  orders: [],
  missedSignals: [],
  updatedAt: new Date().toISOString(),
};

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function markToMarket(): Promise<PaperPortfolio> {
  let equity = portfolio.cash;
  const open: PaperPosition[] = [];
  for (const pos of portfolio.openPositions) {
    const quote = await unifiedQuote(pos.symbol);
    const currentPrice = quote.data.price;
    const unrealizedPnl = (currentPrice - pos.avgEntryPrice) * pos.quantity;
    const unrealizedPnlPct = pos.avgEntryPrice > 0 ? (unrealizedPnl / (pos.avgEntryPrice * pos.quantity)) * 100 : 0;
    open.push({
      ...pos,
      currentPrice,
      unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
      unrealizedPnlPct: Number(unrealizedPnlPct.toFixed(2)),
    });
    equity += currentPrice * pos.quantity;
  }
  portfolio.openPositions = open;
  portfolio.equity = Number(equity.toFixed(2));
  portfolio.totalPnl = Number((equity - portfolio.initialCash).toFixed(2));
  portfolio.totalPnlPct = Number(((portfolio.totalPnl / portfolio.initialCash) * 100).toFixed(2));
  portfolio.updatedAt = new Date().toISOString();
  return portfolio;
}

export async function getPaperPortfolio(): Promise<PaperPortfolio> {
  return markToMarket();
}

export async function placePaperOrder(
  symbol: string,
  side: "buy" | "sell",
  quantity: number
): Promise<{ ok: boolean; order?: PaperOrder; error?: string; portfolio: PaperPortfolio }> {
  if (quantity <= 0) return { ok: false, error: "Invalid quantity", portfolio: await getPaperPortfolio() };
  const quote = await unifiedQuote(symbol);
  const price = quote.data.price;
  const order: PaperOrder = {
    id: uid("ord"),
    symbol,
    side,
    quantity,
    price,
    status: "filled",
    createdAt: new Date().toISOString(),
  };

  if (side === "buy") {
    const cost = price * quantity;
    if (cost > portfolio.cash) {
      order.status = "rejected";
      order.reason = "Insufficient virtual cash";
      portfolio.orders.unshift(order);
      return { ok: false, order, error: order.reason, portfolio: await getPaperPortfolio() };
    }
    portfolio.cash -= cost;
    const existing = portfolio.openPositions.find((p) => p.symbol === symbol);
    if (existing) {
      const totalQty = existing.quantity + quantity;
      existing.avgEntryPrice = (existing.avgEntryPrice * existing.quantity + price * quantity) / totalQty;
      existing.quantity = totalQty;
    } else {
      portfolio.openPositions.push({
        id: uid("pos"),
        symbol,
        side: "long",
        quantity,
        avgEntryPrice: price,
        currentPrice: price,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        openedAt: new Date().toISOString(),
      });
    }
  } else {
    const pos = portfolio.openPositions.find((p) => p.symbol === symbol);
    if (!pos || pos.quantity < quantity) {
      order.status = "rejected";
      order.reason = "Insufficient position";
      portfolio.orders.unshift(order);
      return { ok: false, order, error: order.reason, portfolio: await getPaperPortfolio() };
    }
    const proceeds = price * quantity;
    portfolio.cash += proceeds;
    const pnl = (price - pos.avgEntryPrice) * quantity;
    const closed: PaperPosition = {
      ...pos,
      quantity,
      currentPrice: price,
      unrealizedPnl: Number(pnl.toFixed(2)),
      unrealizedPnlPct: pos.avgEntryPrice > 0 ? Number(((pnl / (pos.avgEntryPrice * quantity)) * 100).toFixed(2)) : 0,
    };
    portfolio.closedPositions.unshift(closed);
    pos.quantity -= quantity;
    if (pos.quantity === 0) portfolio.openPositions = portfolio.openPositions.filter((p) => p.symbol !== symbol);
  }

  portfolio.orders.unshift(order);
  return { ok: true, order, portfolio: await getPaperPortfolio() };
}

export function recordMissedSignal(symbol: string, recommendation: Recommendation, reason: string) {
  portfolio.missedSignals.unshift({ symbol, recommendation, at: new Date().toISOString(), reason });
  if (portfolio.missedSignals.length > 50) portfolio.missedSignals.pop();
}

export function resetPaperPortfolio() {
  portfolio = {
    cash: INITIAL_CASH,
    initialCash: INITIAL_CASH,
    equity: INITIAL_CASH,
    totalPnl: 0,
    totalPnlPct: 0,
    openPositions: [],
    closedPositions: [],
    orders: [],
    missedSignals: [],
    updatedAt: new Date().toISOString(),
  };
}
