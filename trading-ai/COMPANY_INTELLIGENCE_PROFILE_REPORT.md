# COMPANY_INTELLIGENCE_PROFILE_REPORT

**Profile route:** https://trading-ai-beta.vercel.app/dashboard/markets/[symbol]
**Verified:** 2026-07-02T05:12:50.416Z

## Sections

- Overview, Live Market Data, AI Recommendation
- Why AI Selected It, Financials, Announcements, News
- Technical Analysis, Risk Guardian, Related Assets
- Linked Data Providers status panel
- Paper Buy/Sell, Watchlist, Alert, Journal actions

## API routes

- GET /api/company/[symbol]/profile
- GET /api/company/[symbol]/quote|financials|news|announcements|technical|risk|ai
- POST /api/paper/order, /api/watchlist/add, /api/alerts/create, /api/journal/add, /api/portfolio/simulation/add

## Verification

| Step | Status | Detail |
|------|--------|--------|
| Markets assets load | ✅ | 99 assets |
| Saudi tab | ✅ | 22 assets |
| USA tab | ✅ | 20 assets |
| Crypto tab | ✅ | 10 assets |
| Gold tab | ✅ | 3 assets |
| Oil tab | ✅ | 3 assets |
| Aramco profile API | ✅ | 2222 OK |
| Apple profile API | ✅ | hold |
| BTC profile API | ✅ | BTCUSD OK |
| Profile page route | ✅ | HTTP 200 |
| Markets page | ✅ | HTTP 200 |
| Paper order only | ✅ | Blocked: Volatility. Reduce size or wait. |
| Alert creation | ✅ | created |
| Journal entry | ✅ | added |
| Portfolio simulator add | ✅ | NVDA added |
| Provider persistence note | ✅ | Persistence not configured — using local seed/cache fallback |
