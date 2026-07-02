import { getCatalogEntry } from "./catalog";
import { EXCHANGE_TIMEZONES } from "./config";
import type { MarketStatusInfo } from "./types";

export function sessionForExchange(exchange: string): MarketStatusInfo {
  const tz = EXCHANGE_TIMEZONES[exchange] ?? "UTC";
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const hour = local.getHours();
  const day = local.getDay();
  const isWeekend = day === 0 || day === 6;
  let session: MarketStatusInfo["session"] = "unknown";
  let isOpen = false;

  if (exchange === "Crypto") {
    session = "open";
    isOpen = true;
  } else if (exchange === "FX") {
    // Forex: Sun 17:00 ET – Fri 17:00 ET (approximate global FX week)
    const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const etDay = et.getDay();
    const etHour = et.getHours();
    if (etDay === 6) {
      session = "closed";
    } else if (etDay === 0 && etHour < 17) {
      session = "closed";
    } else if (etDay === 5 && etHour >= 17) {
      session = "closed";
    } else {
      session = "open";
      isOpen = true;
    }
  } else if (exchange === "Tadawul") {
    isOpen = !isWeekend && hour >= 10 && hour < 15;
    session = isOpen ? "open" : "closed";
  } else if (["NASDAQ", "NYSE", "COMEX", "CME"].includes(exchange)) {
    if (isWeekend) session = "closed";
    else if (hour >= 9 && hour < 16) {
      session = "open";
      isOpen = true;
    } else if (hour >= 4 && hour < 9) session = "pre_market";
    else if (hour >= 16 && hour < 20) session = "after_hours";
    else session = "closed";
  }

  return {
    exchange,
    timezone: tz,
    session,
    isOpen,
    localTime: local.toISOString(),
  };
}

export function exchangeForSymbol(symbol: string): string {
  return getCatalogEntry(symbol)?.exchange ?? "NASDAQ";
}

export function isSymbolTradableNow(symbol: string): { tradable: boolean; reason: string } {
  const entry = getCatalogEntry(symbol);
  const exchange = entry?.exchange ?? "NASDAQ";
  const status = sessionForExchange(exchange);

  if (entry?.assetClass === "crypto") {
    return { tradable: true, reason: "Crypto markets 24/7" };
  }

  if (status.isOpen) {
    return { tradable: true, reason: `${exchange} session open` };
  }

  return {
    tradable: false,
    reason: `${exchange} ${status.session} — outside trading hours`,
  };
}

export function filterTradableSymbols(symbols: string[]): { tradable: string[]; skipped: { symbol: string; reason: string }[] } {
  const tradable: string[] = [];
  const skipped: { symbol: string; reason: string }[] = [];
  for (const symbol of symbols) {
    const check = isSymbolTradableNow(symbol);
    if (check.tradable) tradable.push(symbol);
    else skipped.push({ symbol, reason: check.reason });
  }
  return { tradable, skipped };
}
