import type { MarketBar } from "@/types/trading";

export function computePeriodChanges(bars: MarketBar[], price: number) {
  const weekRef = bars[Math.max(0, bars.length - 6)]?.close ?? price;
  const monthRef = bars[Math.max(0, bars.length - 22)]?.close ?? price;
  const yearRef = bars[0]?.close ?? price;
  const pct = (ref: number) => (ref > 0 ? Number((((price - ref) / ref) * 100).toFixed(2)) : 0);
  return {
    weekChangePct: pct(weekRef),
    monthChangePct: pct(monthRef),
    yearChangePct: pct(yearRef),
  };
}
