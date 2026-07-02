import type { BacktestResult, BacktestTrade, MarketBar, Signal } from "@/types/trading";
import { smaCrossoverStrategy } from "@/lib/strategies/sma-crossover";
import { rsiStrategy } from "@/lib/strategies/rsi-strategy";
import { sharpeRatio } from "@/lib/market/indicators";

export type StrategyFn = (bars: MarketBar[]) => Signal | null;

export function runBacktest(
  bars: MarketBar[],
  initialCapital = 100_000,
  strategy: StrategyFn = smaCrossoverStrategy
): BacktestResult {
  let cash = initialCapital;
  let shares = 0;
  let peak = initialCapital;
  let maxDrawdown = 0;
  let trades = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let entryPrice = 0;
  let entryDate = "";
  const equityCurve: { date: string; equity: number }[] = [];
  const tradeHistory: BacktestTrade[] = [];

  for (let i = 20; i < bars.length; i++) {
    const slice = bars.slice(0, i + 1);
    const signal = strategy(slice);
    const bar = bars[i];
    const equity = cash + shares * bar.close;

    if (equity > peak) peak = equity;
    const dd = peak > 0 ? (peak - equity) / peak : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (signal?.direction === "long" && shares === 0 && cash > 0) {
      shares = Math.floor(cash / bar.close);
      entryPrice = bar.close;
      entryDate = bar.bar_time.split("T")[0];
      cash -= shares * bar.close;
      trades++;
      tradeHistory.push({
        entryDate,
        side: "long",
        entryPrice,
        quantity: shares,
      });
    } else if (signal?.direction === "short" && shares > 0) {
      const pnl = shares * (bar.close - entryPrice);
      const exitDate = bar.bar_time.split("T")[0];
      const lastTrade = tradeHistory[tradeHistory.length - 1];
      if (lastTrade && !lastTrade.exitDate) {
        lastTrade.exitDate = exitDate;
        lastTrade.exitPrice = bar.close;
        lastTrade.pnl = Number(pnl.toFixed(2));
        lastTrade.pnlPct = entryPrice > 0 ? Number(((pnl / (entryPrice * shares)) * 100).toFixed(2)) : 0;
      }
      if (pnl >= 0) {
        winningTrades++;
        totalProfit += pnl;
      } else {
        losingTrades++;
        totalLoss += Math.abs(pnl);
      }
      cash += shares * bar.close;
      shares = 0;
      trades++;
    }

    equityCurve.push({
      date: bar.bar_time.split("T")[0],
      equity: Number((cash + shares * bar.close).toFixed(2)),
    });
  }

  const finalEquity = cash + shares * bars[bars.length - 1].close;
  const totalReturnPct =
    initialCapital > 0
      ? Number((((finalEquity - initialCapital) / initialCapital) * 100).toFixed(6))
      : 0;
  const closedTrades = winningTrades + losingTrades;
  const winRate = closedTrades > 0 ? Number(((winningTrades / closedTrades) * 100).toFixed(2)) : 0;
  const profitLoss = Number((finalEquity - initialCapital).toFixed(2));
  const riskRewardRatio =
    totalLoss > 0 ? Number((totalProfit / totalLoss).toFixed(2)) : totalProfit > 0 ? 999 : 0;

  return {
    finalEquity: Number(finalEquity.toFixed(2)),
    totalReturnPct,
    maxDrawdownPct: Number((maxDrawdown * 100).toFixed(6)),
    sharpeRatio: sharpeRatio(equityCurve),
    trades,
    winRate,
    profitLoss,
    riskRewardRatio,
    winningTrades,
    losingTrades,
    equityCurve,
    tradeHistory,
  };
}

export function hashBacktestResult(result: BacktestResult): string {
  return [
    result.finalEquity.toFixed(6),
    result.totalReturnPct.toFixed(6),
    result.maxDrawdownPct.toFixed(6),
    result.sharpeRatio.toFixed(2),
    result.trades,
    result.winRate.toFixed(2),
  ].join("|");
}

export const STRATEGIES: Record<string, StrategyFn> = {
  "sma-crossover": smaCrossoverStrategy,
  rsi: rsiStrategy,
};

export function compareStrategies(bars: MarketBar[], initialCapital = 100_000) {
  return Object.entries(STRATEGIES).map(([name, fn]) => {
    const result = runBacktest(bars, initialCapital, fn);
    return { strategy: name, result, reproducibilityHash: hashBacktestResult(result) };
  });
}

export function exportBacktestReport(
  symbol: string,
  strategies: ReturnType<typeof compareStrategies>
): string {
  const lines = [
    `# Backtest Report — ${symbol}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Strategy Comparison",
  ];
  for (const s of strategies) {
    const r = s.result;
    lines.push(
      `### ${s.strategy}`,
      `- Return: ${r.totalReturnPct}%`,
      `- Max Drawdown: ${r.maxDrawdownPct}%`,
      `- Sharpe: ${r.sharpeRatio}`,
      `- Win Rate: ${r.winRate}%`,
      `- Trades: ${r.trades}`,
      `- P/L: $${r.profitLoss}`,
      `- Risk/Reward: ${r.riskRewardRatio}`,
      ""
    );
  }
  return lines.join("\n");
}
