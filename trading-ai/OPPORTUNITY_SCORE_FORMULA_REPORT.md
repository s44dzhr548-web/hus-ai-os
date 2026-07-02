# OPPORTUNITY_SCORE_FORMULA_REPORT

**Production URL:** https://trading-ai-beta.vercel.app/dashboard/smart-money
**Started:** 2026-07-02T05:44:21.159Z
**Finished:** 2026-07-02T05:44:24.380Z
**Result:** ✅ ALL PASSED

## Weighted Opportunity Score

| Component | Weight |
|-----------|--------|
| Money Flow | 25% |
| Technical Analysis | 20% |
| Fundamental Analysis | 20% |
| News & Sentiment | 15% |
| Macro Economy | 10% |
| Risk Management | 10% |

## Grade Scale

| Grade | Range |
|-------|-------|
| A+ | 90–100 |
| A | 80–89 |
| B | 70–79 |
| C | 60–69 |
| Avoid | below 60 |

## UI

- Default view: A+ and A opportunities only
- Toggle: show all grades
- Score breakdown on every opportunity card
- Multi-signal explanation (EN + AR)

## Safety

- Paper trading only
- Broker: **DISABLED**
- No real money execution

## Verification

| Step | Status | Detail |
|------|--------|--------|
| Premium opportunities API | ✅ | 0 premium · fallback sample=TM |
| All grades API | ✅ | 9 items |
| Weighted formula | ✅ | 74.9/100 verified |
| Grade mapping | ✅ | B for 74.9 |
| Asset profile score | ✅ | 59.9/100 · Avoid |
| Smart money page | ✅ | HTTP 200 |
