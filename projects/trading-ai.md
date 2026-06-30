# Trading AI

## Status: Live (Production)
**Priority:** P1  
**Owner:** CEO Agent + Research Agent  
**Last Updated:** 2026-06-30  
**Production:** https://trading-ai-beta.vercel.app  
**Local:** `cd trading-ai && npm run dev` (port 3001)

## Overview
AI-assisted trading analysis platform. Ingests market data, runs signal models, paper-trades strategies, and provides risk-managed insights. **Not financial advice — research and paper trading only for MVP.**

## Goals
- Real-time and historical market data ingestion
- Pluggable strategy engine (backtest + paper trade)
- LLM-generated market summaries with cited data
- Risk dashboard (position limits, drawdown alerts)
- Audit log of every signal and action

## Tech Stack (Proposed)
| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14, TradingView lightweight charts |
| Backend | Next.js API + background workers |
| Database | Supabase + Timescale extension or separate TimescaleDB |
| Queue | Inngest for scheduled jobs |
| Market Data | Alpaca (paper) / Polygon.io (research) |
| AI | Anthropic for analysis narratives |
| Deploy | Vercel + edge functions where applicable |

## Registry Status

| Component | Status | Notes |
|-----------|--------|-------|
| GitHub | 🟢 Connected | Monorepo: s44dzhr548-web/hus-ai-os |
| Deployment | 🟢 Live | trading-ai-beta.vercel.app |
| Database | 🟢 Connected | husai-core Supabase |
| APIs | 🟡 Mock mode | Alpaca keys optional |
| Pending Work | Live broker integration | Requires payment gate |

## Pending Work
1. **Research Agent**: Broker API comparison (Alpaca paper trading first)
2. **Research Agent**: Regulatory disclaimer requirements by jurisdiction
3. **Security Agent**: Review key storage for broker API keys
4. **Database Agent**: Design time-series schema for OHLCV + signals
5. **Setup Agent**: Repo + env scaffold after research sign-off
6. **Developer Agent**: Data ingestion pipeline MVP
7. **Developer Agent**: Paper trading engine (no live money in MVP)
8. **QA Agent**: Backtest reproducibility tests

## Architecture Notes
```
Market Data API → Ingestion Worker → Timescale DB
                                   ↓
Strategy Engine ← Config ← User Strategies
       ↓
Paper Trading Ledger (no real funds MVP)
       ↓
LLM Summary Layer (cited, not predictive claims)
       ↓
Dashboard
```

## Risk & Compliance
- MVP: **paper trading only**
- Live trading: explicit owner consent + legal review (human gate)
- Never store exchange passwords; API keys only with read/trade scope separation
- Prominent disclaimers on all UI

## Success Metrics
- Backtest runs reproducible to 6 decimal places
- Data ingestion lag < 1 min for delayed feeds
- Zero live trades without explicit enablement flag

## Human Gates Anticipated
- **Payment**: Polygon.io, paid market data tiers
- **Legal**: Financial disclaimers, terms of service
- **KYC**: Required only if live broker connection added later

## Notes
Differentiate from generic ChatGPT trading prompts: auditable signals, reproducible backtests, and structured risk limits. Live trading is Phase 3+ only.
