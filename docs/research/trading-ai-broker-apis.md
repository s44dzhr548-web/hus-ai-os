# Broker API Research Brief

**Project:** Trading AI  
**Agent:** Research Agent  
**Date:** 2026-06-30  
**Status:** Complete

## Question
Which broker/market-data API should power the Trading AI MVP (paper trading only)?

## Options Evaluated

| Provider | Paper Trading | Market Data | Free Tier | API Quality | Notes |
|----------|---------------|-------------|-----------|-------------|-------|
| **Alpaca** | ✅ Full paper API | ✅ IEX free | ✅ Generous | Excellent | Best MVP fit |
| Polygon.io | ❌ Data only | ✅ Comprehensive | Limited free | Excellent | Paid for real-time |
| Interactive Brokers | ✅ Paper via TWS | ✅ Full | Complex setup | Good | Heavy KYC for live |
| Yahoo Finance (unofficial) | N/A | ⚠️ Unofficial | Free | Poor | ToS risk — avoid |

## Recommendation
**Alpaca Markets** for MVP:
- Free paper trading account
- REST + WebSocket APIs
- Historical bars included
- Simple OAuth/API key auth
- Node SDK available

**Polygon.io** as Phase 2 add-on for premium data if needed.

## Risks
- Alpaca US markets focus — confirm asset class scope
- Rate limits on free tier — cache aggressively
- Live trading requires separate approval + KYC (Phase 3+)

## Next Steps
1. Setup Agent: Create Alpaca paper account (owner OTP if needed)
2. API Agent: Implement Alpaca client with paper base URL
3. Database Agent: OHLCV + signals schema
