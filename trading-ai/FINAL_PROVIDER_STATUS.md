# Trading AI — Final Provider Status

**Generated:** 2026-07-02T03:14:31.986Z
**Production:** https://trading-ai-beta.vercel.app
**Completion:** 100% (9/9 required providers live)

## Connected providers

| Provider | Live | Latency | Key | Error |
|----------|------|---------|-----|-------|
| CoinGecko | ✅ | 128ms | yes | — |
| Binance Public | ❌ | 252ms | yes | Probe returned no data |
| Yahoo Finance | ✅ | 129ms | yes | — |
| Frankfurter ECB | ✅ | 141ms | yes | — |
| Finnhub | ✅ | 149ms | yes | — |
| Polygon.io | ✅ | 223ms | yes | — |
| Alpha Vantage | ❌ | —ms | public | API key not configured |
| Twelve Data | ✅ | 165ms | yes | — |
| Forex Provider (keyed) | ✅ | 139ms | public | — |
| Tadawul / Saudi (Yahoo .SR · licensed key optional) | ✅ | 326ms | public | — |
| News API | ✅ | 199ms | yes | — |
| Economic Calendar | ✅ | 208ms | public | — |

## Remaining optional providers

| Provider | Env | Notes |
|----------|-----|-------|
| Trading Economics | `TRADING_ECONOMICS_API_KEY` | Paid (~$49/week) — deferred for MVP |
| Alpha Vantage | `ALPHA_VANTAGE_API_KEY` | Backup only |
| Forex keyed (OANDA) | `FOREX_PROVIDER_KEY` | Frankfurter public active |
| CoinGecko Pro | `COINGECKO_API_KEY` | Public tier active |
| Binance signed | `BINANCE_API_KEY` | Public market data active |
| Tadawul licensed | `TADAWUL_PROVIDER_KEY` | Yahoo .SR fallback active |
| FMP | `FMP_API_KEY` | Connected — financial statements |

## Missing required API keys

_None — all required keys configured_

## Market coverage

| Market | Symbol | Source | Price |
|--------|--------|--------|-------|
| US Stocks | AAPL | finnhub | 294.38 |
| Saudi / Tadawul | 2222 | yahoo | 26.12 |
| Crypto | BTCUSD | coingecko | 60366 |
| Forex | EURUSD | forex | 1.1383 |
| Commodities | CLUSD | yahoo | 67.73 |
| Indices | SPX | yahoo | 7483.23 |
| ETFs | SPY | yahoo | 745.76 |
| News | AAPL | news_api | — |
| Economic Calendar | GLOBAL | faireconomy | — |

## Runtime health (manager)

| Provider | Status | Latency | Last update | Errors |
|----------|--------|---------|-------------|--------|
| Mock Market Data (fallback only) | healthy | 0ms | 2026-07-02T03:14:31.451Z | 0 |
| Alpha Vantage | requires_key | 0ms | 2026-07-02T03:14:31.451Z | 0 |
| Twelve Data | healthy | 0ms | 2026-07-02T03:14:31.451Z | 0 |
| Finnhub | healthy | 0ms | 2026-07-02T03:14:31.358Z | 0 |
| Polygon.io | healthy | 0ms | 2026-07-02T03:14:31.451Z | 0 |
| Yahoo Finance | healthy | 8ms | 2026-07-02T03:14:31.450Z | 0 |
| CoinGecko | healthy | 0ms | 2026-07-02T03:14:31.388Z | 0 |
| Binance Public | healthy | 0ms | 2026-07-02T03:14:31.451Z | 0 |
| Forex Provider (keyed) | requires_key | 0ms | 2026-07-02T03:14:31.423Z | 0 |
| Frankfurter ECB | healthy | 0ms | 2026-07-02T03:14:31.451Z | 0 |
| Tadawul / Saudi (Yahoo .SR · licensed key optional) | down | 0ms | 2026-07-02T03:14:31.451Z | 0 |
| News API | healthy | 0ms | 2026-07-02T03:14:31.451Z | 0 |
| Economic Calendar | requires_key | 0ms | 2026-07-02T03:14:31.451Z | 0 |

## Fallback chains

- **us_stock:** polygon → finnhub → yahoo → twelve_data
- **saudi:** tadawul licensed → yahoo .SR → alpha_vantage
- **crypto:** binance → coingecko → polygon
- **forex:** frankfurter → twelve_data → alpha_vantage
- **commodity:** yahoo → twelve_data
- **etf:** polygon → finnhub → yahoo
- **news:** newsapi → yahoo rss
- **economic_calendar:** faireconomy (free) → finnhub · trading economics optional

## Infrastructure

- Auto-failover: ON
- Cache: memory 17 · disk 7
- Avg log latency: 7ms
- Monthly API cost: $0

## Polygon.io / Massive

Polygon is connected via `MASSIVE_API_KEY` / `POLYGON_API_KEY` (Massive.com rebrand). Same key works on api.massive.com.
