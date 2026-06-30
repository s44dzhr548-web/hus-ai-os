# HUSAI-OS Project Registry Dashboard

> Auto-synced from `memory.md`. Last updated: 2026-06-30

## System Status

| Metric | Value |
|--------|-------|
| Active projects | 3 |
| Production deploys | 0 (awaiting OAuth) |
| Test suites passing | 3/3 locally |
| Human gates open | GitHub, Supabase, Vercel |

## Projects

### Restaurant OS — P1 🟡
- **Local:** ✅ Core MVP built
- **GitHub:** ⬜ No remote
- **Vercel:** ⬜ Not deployed
- **Supabase:** ⬜ Migration ready, not applied
- **Features:** Auth, menu, orders, KDS, settings, public menu
- **Tests:** 2 passing

### Trading AI — P1 🟡
- **Local:** ✅ App scaffold + backtest engine
- **GitHub:** ⬜ No remote
- **Features:** SMA signals, backtest API, dashboard, disclaimer
- **Tests:** 4 passing
- **Blocked:** Alpaca API keys (optional — mock mode works)

### Dropshipping Research — P2 🟡
- **Local:** ✅ Niche scoring module
- **Features:** Score/rank algorithm, demo data, legal scan
- **Tests:** 2 passing
- **Next:** Full Next.js app + CJ API

## Agent Activity Queue

1. **Setup Agent** — waiting on Supabase + GitHub OAuth
2. **Deployment Agent** — waiting on Vercel OAuth
3. **Developer Agent** — continue feature work locally ✅
4. **Research Agent** — legal scan complete ✅

## Quick Commands

```powershell
# Restaurant OS
cd restaurant-os && npm run dev

# Trading AI
cd trading-ai && npm run dev

# Run all tests
cd restaurant-os && npm test
cd trading-ai && npm test
cd dropshipping-research && npm test
```
