import { BacktestClient } from "@/components/backtest-client";

export default function BacktestPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Backtesting</h1>
      <p className="mt-1 text-sm text-zinc-500">Historical strategy simulation · Win rate · Drawdown · Strategy comparison</p>
      <div className="mt-8">
        <BacktestClient />
      </div>
    </div>
  );
}
