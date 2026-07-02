import type { MarketBar, TechnicalAnalysis } from "@/types/trading";

export function sma(values: number[], period: number): number {
  if (values.length === 0) return 0;
  if (values.length < period) return values[values.length - 1] ?? 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let val = values[0];
  for (let i = 1; i < values.length; i++) {
    val = values[i] * k + val * (1 - k);
  }
  return val;
}

export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period || 0.0001;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  const ema12Series: number[] = [];
  const ema26Series: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    ema12Series.push(ema(closes.slice(0, i + 1), 12));
    ema26Series.push(ema(closes.slice(0, i + 1), 26));
  }
  const macdLine = ema12Series[ema12Series.length - 1] - ema26Series[ema26Series.length - 1];
  const macdSeries = ema12Series.map((v, i) => v - ema26Series[i]);
  const signalLine = ema(macdSeries, 9);
  return {
    macd: Number(macdLine.toFixed(4)),
    signal: Number(signalLine.toFixed(4)),
    histogram: Number((macdLine - signalLine).toFixed(4)),
  };
}

export function volatility(closes: number[], period = 20): number {
  if (closes.length < period + 1) return 0;
  const returns: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    const prev = closes[i - 1];
    if (prev > 0) returns.push((closes[i] - prev) / prev);
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Number(Math.sqrt(variance).toFixed(4));
}

export function trendStrength(closes: number[], period = 20): number {
  if (closes.length < period) return 50;
  const slice = closes.slice(-period);
  const first = slice[0];
  const last = slice[slice.length - 1];
  if (first <= 0) return 50;
  const pct = ((last - first) / first) * 100;
  return Math.max(0, Math.min(100, Number((50 + pct * 5).toFixed(0))));
}

export function volumeTrend(volumes: number[]): "rising" | "falling" | "flat" {
  if (volumes.length < 10) return "flat";
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior === 0) return "flat";
  const ratio = recent / prior;
  if (ratio > 1.1) return "rising";
  if (ratio < 0.9) return "falling";
  return "flat";
}

export function computeTechnical(bars: MarketBar[]): TechnicalAnalysis {
  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const rsiVal = rsi(closes);
  const macdData = macd(closes);
  const vol = volatility(closes);
  const strength = trendStrength(closes);
  const last = closes[closes.length - 1];
  const trend =
    last > sma20 && sma20 > sma50 ? "bullish" : last < sma20 && sma20 < sma50 ? "bearish" : "neutral";
  const macdSignal =
    macdData.histogram > 0 ? "positive" : macdData.histogram < 0 ? "negative" : "neutral";
  const recentLow = Math.min(...closes.slice(-20));
  const recentHigh = Math.max(...closes.slice(-20));
  const avgVol = volumes.length ? volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length) : 0;
  const volTrend = volumeTrend(volumes);

  return {
    trend,
    trendStrength: strength,
    rsi: Number(rsiVal.toFixed(1)),
    sma20: Number(sma20.toFixed(2)),
    sma50: Number(sma50.toFixed(2)),
    ema12: Number(ema12.toFixed(2)),
    ema26: Number(ema26.toFixed(2)),
    macd: macdData.macd,
    macdSignal,
    macdHistogram: macdData.histogram,
    support: Number(recentLow.toFixed(2)),
    resistance: Number(recentHigh.toFixed(2)),
    volatility: vol,
    volumeTrend: volTrend,
    avgVolume: Math.floor(avgVol),
    summary: `${trend} trend (${strength}/100) · RSI ${rsiVal.toFixed(0)} · MACD ${macdSignal} · Vol ${volTrend}`,
  };
}

export function sharpeRatio(equityCurve: { equity: number }[], riskFreeRate = 0.02): number {
  if (equityCurve.length < 3) return 0;
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    if (prev > 0) returns.push((equityCurve[i].equity - prev) / prev);
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const dailyRf = riskFreeRate / 252;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return Number(((mean - dailyRf) / std * Math.sqrt(252)).toFixed(2));
}
