# FINAL_MARKET_INTELLIGENCE_REPORT

**Production URL:** https://trading-ai-beta.vercel.app
**Markets:** https://trading-ai-beta.vercel.app/dashboard/markets
**Example profiles:**
- [Aramco](https://trading-ai-beta.vercel.app/dashboard/markets/2222.SR)
- [Apple](https://trading-ai-beta.vercel.app/dashboard/markets/AAPL)
- [Bitcoin](https://trading-ai-beta.vercel.app/dashboard/markets/BTC-USD)

## Status

- Markets completed: Yes
- Assets loaded: 99 total
- Company profile routes: /dashboard/markets/[symbol]
- Connected providers: Yahoo, CoinGecko, Binance, Frankfurter, Finnhub (when keyed), Polygon (when keyed)
- Missing provider keys: FINNHUB_API_KEY, POLYGON_API_KEY, NEWS_API_KEY (optional — demo fallback active)
- Fallback data: Seeded universe + demo quotes/news/financials when live unavailable
- Paper trading: Enabled (paper only)
- Broker: **DISABLED** (realBrokerExecution: false)
- Supabase persistence: Optional — schema added; runtime uses memory fallback when not configured

## Verification steps

- ✅ Markets assets load: 99 assets
- ✅ Saudi tab: 22 assets
- ✅ USA tab: 20 assets
- ✅ Crypto tab: 10 assets
- ✅ Gold tab: 3 assets
- ✅ Oil tab: 3 assets
- ✅ Aramco profile API: 2222 OK
- ✅ Apple profile API: hold
- ✅ BTC profile API: BTCUSD OK
- ✅ Profile page route: HTTP 200
- ✅ Markets page: HTTP 200
- ✅ Paper order only: Blocked: Volatility. Reduce size or wait.
