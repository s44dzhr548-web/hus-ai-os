# SMART_MONEY_FLOW_REPORT

**Production URL:** https://trading-ai-beta.vercel.app/dashboard/smart-money
**Started:** 2026-07-02T05:26:24.207Z
**Finished:** 2026-07-02T05:26:30.264Z
**Result:** ✅ ALL PASSED

## Engine

- Smart Money Flow Opportunity Engine
- Tracks: stocks, Saudi, US, crypto, gold, oil, forex, bonds, cash, sectors
- Detects: inflow/outflow, rotation, volume anomaly, accumulation/distribution, risk-on/off
- Opportunity score: 25% flow · 20% technical · 20% fundamentals · 15% news · 10% macro · 10% risk

## Routes

- [Flow Map](https://trading-ai-beta.vercel.app/dashboard/smart-money)
- [Flow API](https://trading-ai-beta.vercel.app/api/smart-money/flow)
- [Opportunities API](https://trading-ai-beta.vercel.app/api/smart-money/opportunities)

## Safety

- Paper trading only
- Broker: **DISABLED**
- Live providers when available; demo fallback when missing
- Arabic default + English via i18n

## Verification

| Step | Status | Detail |
|------|--------|--------|
| Flow API | ✅ | 9 asset flows |
| Sectors API | ✅ | 10 inflows |
| Opportunities API | ✅ | top=TM |
| Rotation API | ✅ | 3 rotations |
| Asset flow profile | ✅ | 2222 OK |
| Smart money page | ✅ | HTTP 200 |
| Smart money page (AR route) | ✅ | HTTP 200 |
