# HUSAI Trading AI — Advanced Differentiation Platform

**Date:** June 30, 2026  
**Production:** https://trading-ai-beta.vercel.app  
**GitHub:** https://github.com/s44dzhr548-web/hus-ai-os  
**Tests:** 51/51 · **Routes:** 66 · **Paper only · Broker OFF**

---

## New Advanced Features (This Release)

| # | Feature | Route | API |
|---|---------|-------|-----|
| 1 | **Auto Paper Trading Bot** | `/dashboard/auto-bot` | `GET/POST /api/bot` |
| 2 | **Why Now AI** | `/dashboard/why-now` | `/api/intelligence/modules?module=why-now` |
| 3 | **What Must Change** | `/dashboard/what-must-change` | `/api/intelligence/modules?module=what-must-change` |
| 4 | **Event Impact Map** | `/dashboard/event-impact` | `/api/intelligence/event-impact` |
| 5 | **Market Health Score** | `/dashboard/market-health` | `/api/intelligence/platform` |
| 6 | **Smart Money Flow** | `/dashboard/money-flow` | `/api/intelligence/platform?type=smart-money` |
| 7 | **Scenario Simulator** | `/dashboard/scenarios` | `/api/intelligence/platform?type=scenarios` |
| 8 | **AI Memory** | `/dashboard/ai-memory` | `/api/intelligence/performance` |
| 9 | **Confidence Accuracy** | `/dashboard/ai-memory` | `/api/intelligence/performance` |
| 10 | **Investor Journal** | `/dashboard/journal` | `/api/journal` (entry/exit reason, emotion, mistake tags) |
| 11 | **Risk Guardian** | `/dashboard/risk-guardian` | `/api/risk/guardian` |
| 12 | **Competitor Gap Engine** | `/competitors` | `/api/competitors` |
| 13 | **Arabic Market Intelligence** | `/dashboard/arabic-intelligence` | `/api/intelligence/modules` |
| 14 | **AI Debate** | `/dashboard/ai-debate` | `/api/intelligence/debate` |

---

## Auto Bot Behavior (Paper Only)

- Scans watchlist on 15-minute schedule (manual run supported)
- Opens/closes **virtual** positions from AI signals
- Stop loss / take profit from risk settings
- Daily loss limit via Risk Guardian
- Full activity log (EN/AR)

---

## Risk Guardian

- Emergency stop toggle
- Blocks paper orders when daily loss exceeded
- Max risk per trade enforcement
- Allowed markets filter
- Integrated into `/api/paper` and auto bot

---

## AI Debate

- **Bull agent** argues BUY
- **Bear agent** argues SELL
- **Risk agent** evaluates downside
- Final bilingual verdict with confidence

---

## Unified Modules API

`GET /api/intelligence/modules` — bot, guardian, event impact, market health, smart money, scenarios, Arabic brief, AI memory, competitor gaps, data quality

---

## Safety

| Rule | Status |
|------|--------|
| Real broker execution | **DISABLED** |
| Paper trading only | **YES** |
| No real money | **YES** |
| Demo fallback when keys missing | **YES** |
| Arabic default + English | **YES** |
| Audit log | **YES** |

---

## Test Coverage

- `bot.test.ts` — auto bot, guardian, debate, event impact, Arabic brief, transitions
- `intelligence.test.ts` — cross-market, strategy lab, memory, scenarios
- `i18n.test.ts` — Arabic default, RTL/LTR, bilingual module keys
- `analysis-engine.test.ts` — Why Now, transitions, consensus

---

## Remaining Human Actions

1. Optional API keys in Vercel (FINNHUB, POLYGON, etc.)
2. SMTP/WhatsApp for alerts (optional)

*Not financial advice · Educational use only · Paper trading simulation*
