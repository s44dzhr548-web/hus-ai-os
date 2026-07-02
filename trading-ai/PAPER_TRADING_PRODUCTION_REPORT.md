# Trading AI — Paper Trading Production Report

**Production URL:** https://trading-ai-beta.vercel.app
**Started:** 2026-07-02T03:34:29.926Z
**Finished:** 2026-07-02T03:34:55.357Z
**Result:** ✅ ALL PASSED

## Compliance

- Paper trading only: **YES**
- Real broker: **DISABLED**
- Verification mode: **Live production HTTP**

## Live market quotes

| Symbol | Price | Source | Mode |
|--------|-------|--------|------|
| AAPL | 294.38 | yahoo | LIVE |
| TSLA | 425.3 | yahoo | LIVE |
| MSFT | 384.28 | finnhub | LIVE |
| BTCUSD | 60466 | yahoo | LIVE |
| ETHUSD | 1626.66 | coingecko | LIVE |
| EURUSD | 1.1383 | yahoo | LIVE |
| GCUSD | 4073 | yahoo | LIVE |
| CLUSD | 67.61 | yahoo | LIVE |
| TASI | 10856.9 | yahoo | LIVE |

## AI recommendations (production)

| Symbol | Action | Confidence |
|--------|--------|------------|
| AAPL | **HOLD** | 0.63 |
| TSLA | **HOLD** | 0.71 |
| MSFT | **SELL** | 0.55 |
| BTCUSD | **BUY** | 0.86 |
| ETHUSD | **BUY** | 0.78 |
| EURUSD | **SELL** | 0.71 |
| GCUSD | **SELL** | 0.85 |
| CLUSD | **SELL** | 0.94 |
| TASI | **SELL** | 0.7 |

## E2E workflow (server-side single invocation)

**E2E result:** ✅ PASSED

### Paper trades

| Symbol | Side | Status |
|--------|------|--------|
| ETHUSD | buy | ✅ Filled |

### Portfolio metrics

| Metric | Value |
|--------|-------|
| Profit/Loss | $0 |
| ROI | 0% |
| Win Rate | 0% |
| Drawdown | 0% |
| Risk Score | 50/100 |

### Stress test

- Attempted: **100**
- Succeeded: **4**
- Blocked: **96**

## Production verification steps

| Step | Status | Duration | Detail |
|------|--------|----------|--------|
| Health check | ✅ | 0ms | Base URL: https://trading-ai-beta.vercel.app |
| API /api/health | ✅ | 2167ms | OK |
| Compliance lock (paper only) | ✅ | 878ms | Real broker OFF · compliance locked |
| Provider verification | ✅ | 727ms | 11 providers connected |
| Live quote AAPL | ✅ | 927ms | yahoo · 294.38 · LIVE |
| Live quote TSLA | ✅ | 398ms | yahoo · 425.3 · LIVE |
| Live quote MSFT | ✅ | 400ms | finnhub · 384.28 · LIVE |
| Live quote BTCUSD | ✅ | 614ms | yahoo · 60466 · LIVE |
| Live quote ETHUSD | ✅ | 637ms | coingecko · 1626.66 · LIVE |
| Live quote EURUSD | ✅ | 368ms | yahoo · 1.1383 · LIVE |
| Live quote GCUSD | ✅ | 403ms | yahoo · 4073 · LIVE |
| Live quote CLUSD | ✅ | 361ms | yahoo · 67.61 · LIVE |
| Live quote TASI | ✅ | 762ms | yahoo · 10856.9 · LIVE |
| AI analysis AAPL | ✅ | 705ms | HOLD · conf 0.63 |
| AI analysis TSLA | ✅ | 522ms | HOLD · conf 0.71 |
| AI analysis MSFT | ✅ | 1274ms | SELL · conf 0.55 |
| AI analysis BTCUSD | ✅ | 550ms | BUY · conf 0.86 |
| AI analysis ETHUSD | ✅ | 615ms | BUY · conf 0.78 |
| AI analysis EURUSD | ✅ | 981ms | SELL · conf 0.71 |
| AI analysis GCUSD | ✅ | 518ms | SELL · conf 0.85 |
| AI analysis CLUSD | ✅ | 431ms | SELL · conf 0.94 |
| AI analysis TASI | ✅ | 449ms | SELL · conf 0.7 |
| Chart candles AAPL | ✅ | 664ms | 21 bars |
| Risk Guardian state | ✅ | 735ms | Trading allowed |
| Risk Guardian validate MSFT | ✅ | 371ms | Allowed |
| Dashboard /dashboard | ✅ | 692ms | HTTP 200 |
| Dashboard /dashboard/providers | ✅ | 720ms | HTTP 200 |
| Dashboard /dashboard/paper | ✅ | 671ms | HTTP 200 |
| Dashboard /dashboard/journal | ✅ | 614ms | HTTP 200 |
| Dashboard /dashboard/alerts | ✅ | 645ms | HTTP 200 |
| Dashboard /dashboard/analysis | ✅ | 640ms | HTTP 200 |
| Dashboard /dashboard/risk-guardian | ✅ | 621ms | HTTP 200 |
| Dashboard /dashboard/portfolio-manager | ✅ | 810ms | HTTP 200 |
| Full paper E2E (single invocation) | ✅ | 1052ms | 32/32 steps passed |
| Paper portfolio API | ✅ | 613ms | Equity $100000 |
| Journal API | ✅ | 611ms | 7 entries |
| Alerts API | ✅ | 609ms | 12 alerts |
| Portfolio manager stats | ✅ | 668ms | Equity $100000 · drawdown 0% |

## Dashboard links

- [/dashboard](https://trading-ai-beta.vercel.app/dashboard)
- [/dashboard/providers](https://trading-ai-beta.vercel.app/dashboard/providers)
- [/dashboard/paper](https://trading-ai-beta.vercel.app/dashboard/paper)
- [/dashboard/journal](https://trading-ai-beta.vercel.app/dashboard/journal)
- [/dashboard/alerts](https://trading-ai-beta.vercel.app/dashboard/alerts)
- [/dashboard/analysis](https://trading-ai-beta.vercel.app/dashboard/analysis)
- [/dashboard/risk-guardian](https://trading-ai-beta.vercel.app/dashboard/risk-guardian)
- [/dashboard/portfolio-manager](https://trading-ai-beta.vercel.app/dashboard/portfolio-manager)

## Deploy

- Production: https://trading-ai-beta.vercel.app
- E2E endpoint: `https://trading-ai-beta.vercel.app/api/paper/e2e`
