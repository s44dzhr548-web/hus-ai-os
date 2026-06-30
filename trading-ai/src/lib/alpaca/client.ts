import type { AlpacaBar, MarketBar } from "@/types/trading";

const PAPER_BASE = "https://paper-api.alpaca.markets";
const DATA_BASE = "https://data.alpaca.markets";

export function isAlpacaConfigured(): boolean {
  return Boolean(
    process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET
  );
}

function mockBars(symbol: string, days = 30): MarketBar[] {
  const bars: MarketBar[] = [];
  let price = 100 + Math.random() * 50;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const change = (Math.random() - 0.48) * 3;
    const open = price;
    const close = Math.max(1, price + change);
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    bars.push({
      symbol,
      timeframe: "1Day",
      bar_time: d.toISOString(),
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(Math.max(0.01, low).toFixed(4)),
      close: Number(close.toFixed(4)),
      volume: Math.floor(Math.random() * 1_000_000),
    });
    price = close;
  }
  return bars;
}

export async function fetchBars(
  symbol: string,
  start?: string,
  end?: string
): Promise<MarketBar[]> {
  if (!isAlpacaConfigured()) {
    return mockBars(symbol);
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
    return mockBars(symbol);
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
