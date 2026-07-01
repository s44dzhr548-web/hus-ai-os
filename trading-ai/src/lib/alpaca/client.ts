import type { AlpacaBar, MarketBar } from "@/types/trading";
import { generateMockBars } from "@/lib/data/mock-market";

const PAPER_BASE = "https://paper-api.alpaca.markets";
const DATA_BASE = "https://data.alpaca.markets";

export function isAlpacaConfigured(): boolean {
  return Boolean(
    process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET
  );
}

export async function fetchBars(
  symbol: string,
  start?: string,
  end?: string
): Promise<MarketBar[]> {
  if (!isAlpacaConfigured()) {
    return generateMockBars(symbol);
  }

  const params = new URLSearchParams({
    timeframe: "1Day",
    start: start ?? new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0],
    end: end ?? new Date().toISOString().split("T")[0],
    limit: "100",
  });

  const res = await fetch(
    `${DATA_BASE}/v2/stocks/${symbol}/bars?${params}`,
    {
      headers: {
        "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
        "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET!,
      },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    return generateMockBars(symbol);
  }

  const data = (await res.json()) as { bars?: AlpacaBar[] };
  return (data.bars ?? []).map((b) => ({
    symbol,
    timeframe: "1Day",
    bar_time: b.t,
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    volume: b.v,
  }));
}

export async function getPaperAccount(): Promise<{ cash: number; equity: number }> {
  if (!isAlpacaConfigured()) {
    return { cash: 100_000, equity: 100_000 };
  }

  const res = await fetch(`${PAPER_BASE}/v2/account`, {
    headers: {
      "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
      "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET!,
    },
  });

  if (!res.ok) return { cash: 100_000, equity: 100_000 };
  const data = await res.json();
  return {
    cash: parseFloat(data.cash),
    equity: parseFloat(data.equity),
  };
}
