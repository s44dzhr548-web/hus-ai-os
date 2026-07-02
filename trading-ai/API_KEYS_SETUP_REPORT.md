# Trading AI — API Keys Setup

**Updated:** 2026-07-02  
**Rules:** Paper only · No broker · Keys in `.env.local` + Vercel only · Never GitHub

## MVP integration queue (user order)

| # | Provider | Env variable | Status | Notes |
|---|----------|--------------|--------|-------|
| 1 | Massive / Polygon.io | `MASSIVE_API_KEY` / `POLYGON_API_KEY` | ✅ Connected | Live US stocks · production verified |
| 2 | NewsAPI | `NEWS_API_KEY` | ⏳ **Awaiting key** | Signup open — paste key when ready |
| 3 | CoinGecko | `COINGECKO_API_KEY` | ✅ Connected (public) | Live BTC · optional Pro key |
| 4 | Binance | `BINANCE_API_KEY` | ✅ Connected (public) | Live BTC · optional signed API |
| 5 | Tadawul / Saudi | `TADAWUL_PROVIDER_KEY` | ✅ Connected (fallback) | Live 2222 via Yahoo `.SR` |

## Also connected (earlier setup)

| Provider | Env | Status |
|----------|-----|--------|
| Finnhub | `FINNHUB_API_KEY` | ✅ Connected |
| Twelve Data | `TWELVE_DATA_API_KEY` | ✅ Connected |
| FMP | `FMP_API_KEY` | ✅ Connected |

## Optional / deferred (MVP)

| Provider | Env | Reason |
|----------|-----|--------|
| Trading Economics | `TRADING_ECONOMICS_API_KEY=` | ~$49/week — skipped for MVP; integration architecture ready |
| CoinGecko Pro | `COINGECKO_API_KEY=` | Public tier sufficient |
| Binance signed | `BINANCE_API_KEY=` | Public market data sufficient |
| Tadawul licensed | `TADAWUL_PROVIDER_KEY=` | Yahoo `.SR` fallback active |

---

## Where to get each API key

| Provider | Signup | Where to copy the key |
|----------|--------|------------------------|
| Polygon / Massive | https://massive.com/dashboard/api-keys | Dashboard → **API Keys** → copy key |
| NewsAPI | https://newsapi.org/register | After login → **Account** → **API Key** |
| CoinGecko (optional) | https://www.coingecko.com/en/api/pricing | Dashboard → **API Key** |
| Binance (optional) | https://www.binance.com/en/my/settings/api-management | **Create API** (read-only for data) |
| Tadawul licensed | Saudi Exchange data partner | Vendor contract — `TADAWUL_PROVIDER_KEY` when licensed |

---

## Local workflow (never commit secrets)

1. Add keys to `trading-ai/.provider-keys.local` (gitignored)
2. Run from `trading-ai/`:

```bash
node scripts/provider-env.mjs apply-local-input
node scripts/provider-env.mjs verify-mvp-queue
node scripts/provider-env.mjs sync-vercel NEWS_API_KEY
node scripts/provider-env.mjs generate-mvp-report
```

3. Redeploy from monorepo root:

```bash
npx vercel deploy --prod --yes --scope hus707002h-7024s-projects --force --project trading-ai
```

---

## Completion checklist

- [x] Massive/Polygon · Finnhub · Twelve Data · FMP — local + Vercel + production
- [x] Trading Economics marked optional (`TRADING_ECONOMICS_API_KEY=` placeholder)
- [x] CoinGecko · Binance · Saudi (Yahoo `.SR`) — verified live locally
- [ ] NewsAPI — **waiting for your key**
- [ ] Final MVP report after NewsAPI connected
