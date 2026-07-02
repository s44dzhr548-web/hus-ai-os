# Trading AI — Provider MVP Final Report

**Generated:** 2026-07-02T02:58:49.861Z
**Production:** https://trading-ai-beta.vercel.app

## Connected providers

| Provider | Live | Latency | Key |
|----------|------|---------|-----|
| CoinGecko | ✅ | 8ms | yes |
| Binance Public | ❌ | 15ms | yes |
| Yahoo Finance | ✅ | 5ms | yes |
| Frankfurter ECB | ✅ | 5ms | yes |
| Finnhub | ✅ | 10ms | yes |
| Polygon.io | ✅ | 12ms | yes |
| Alpha Vantage | ❌ | —ms | public/fallback |
| Twelve Data | ✅ | 13ms | yes |
| Forex Provider (keyed) | ❌ | —ms | public/fallback |
| Tadawul / Saudi | ❌ | —ms | public/fallback |
| News API | ✅ | 5ms | yes |
| Economic Calendar | ❌ | —ms | public/fallback |

## Optional / deferred (MVP)

| Provider | Env | Reason |
|----------|-----|--------|
| Trading Economics | `TRADING_ECONOMICS_API_KEY` | ~$49/week — deferred; architecture ready |
| CoinGecko Pro | `COINGECKO_API_KEY` | Public tier active |
| Binance signed | `BINANCE_API_KEY` | Public market data active |
| Tadawul licensed | `TADAWUL_PROVIDER_KEY` | Yahoo `.SR` fallback active |

## Coverage by market

| Market | Symbol | Source | Price |
|--------|--------|--------|-------|
| US Stocks | AAPL | yahoo | 294.38 |
| Saudi / Tadawul | 2222 | yahoo | 26.12 |
| Crypto | BTCUSD | yahoo | 60363 |
| Forex | EURUSD | yahoo | 1.1383 |
| Commodities | CLUSD | yahoo | 67.76 |
| Indices | SPX | yahoo | 7483.23 |
| ETFs | SPY | yahoo | 745.76 |
| News | AAPL | news_api | — |
| Economic Calendar | GLOBAL | faireconomy | — |

## Fallback priority

- **us_stock:** polygon → finnhub → yahoo → twelve_data
- **saudi:** tadawul (yahoo .SR) → yahoo → alpha_vantage
- **crypto:** binance → coingecko → polygon
- **forex:** frankfurter → twelve_data → alpha_vantage
- **commodity:** yahoo → twelve_data
- **etf:** polygon → finnhub → yahoo
- **news:** newsapi → yahoo rss
- **economic_calendar:** faireconomy (free) → finnhub · TE optional deferred

## Missing required keys

- `ECONOMIC_CALENDAR_API_KEY`
- `ALPHA_VANTAGE_API_KEY`
