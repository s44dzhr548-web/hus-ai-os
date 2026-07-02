# Trading AI — Paper Trading E2E Test Report

**Started:** 2026-07-02T03:28:59.076Z
**Finished:** 2026-07-02T03:29:19.826Z
**Result:** ✅ ALL PASSED

## Compliance

- Paper trading only: **YES**
- Real broker allowed: **NO**

## Live market quotes

| Symbol | Price | Source | Mode |
|--------|-------|--------|------|
| AAPL | 294.38 | yahoo | LIVE |
| TSLA | 425.3 | yahoo | LIVE |
| MSFT | 384.28 | yahoo | LIVE |
| BTCUSD | 60579.99 | yahoo | LIVE |
| ETHUSD | 1623.1 | coingecko | LIVE |
| EURUSD | 1.1383 | yahoo | LIVE |
| GCUSD | 4070.7 | yahoo | LIVE |
| CLUSD | 67.6 | yahoo | LIVE |
| TASI | 10856.9 | yahoo | LIVE |

## AI recommendations

| Symbol | Action | Confidence | Explanation (summary) |
|--------|--------|------------|------------------------|
| AAPL | **HOLD** | 0.63 | Technical: neutral trend (24/100) · RSI 52 · MACD negative · Vol rising. Support |
| TSLA | **HOLD** | 0.71 | Technical: neutral trend (52/100) · RSI 66 · MACD positive · Vol flat. Support 3 |
| MSFT | **SELL** | 0.55 | Technical: bearish trend (0/100) · RSI 44 · MACD negative · Vol rising. Support  |
| BTCUSD | **HOLD** | 0.86 | Technical: bearish trend (20/100) · RSI 40 · MACD positive · Vol falling. Suppor |
| ETHUSD | **BUY** | 0.78 | Technical: bullish trend (63/100) · RSI 62 · MACD positive · Vol flat. Support 1 |
| EURUSD | **SELL** | 0.71 | Technical: bearish trend (39/100) · RSI 32 · MACD negative · Vol flat. Support 1 |
| GCUSD | **SELL** | 0.85 | Technical: bearish trend (5/100) · RSI 49 · MACD negative · Vol rising. Support  |
| CLUSD | **SELL** | 0.94 | Technical: bearish trend (0/100) · RSI 14 · MACD negative · Vol falling. Support |
| TASI | **SELL** | 0.7 | Technical: bearish trend (43/100) · RSI 50 · MACD negative · Vol falling. Suppor |

## Paper trades executed

| Symbol | Side | Status |
|--------|------|--------|
| ETHUSD | buy | ✅ Filled |

## Portfolio metrics

| Metric | Value |
|--------|-------|
| Profit/Loss | $0 |
| ROI | 0% |
| Win Rate | 0% |
| Drawdown | 0% |
| Risk Score | 50/100 (medium) |
| Open positions | 5 |
| Closed trades | 0 |
| Total orders | 5 |

## Stress test (100 simulated paper trades)

- Attempted: **100**
- Succeeded: **4**
- Blocked/guarded: **96**

## Test steps

| Step | Status | Duration | Detail |
|------|--------|----------|--------|
| Provider verification | ✅ | 8949ms | 8/13 providers connected · 8 live markets |
| Live quote AAPL | ✅ | 0ms | yahoo · 294.38 · LIVE |
| Live quote TSLA | ✅ | 366ms | yahoo · 425.3 · LIVE |
| Live quote MSFT | ✅ | 170ms | yahoo · 384.28 · LIVE |
| Live quote BTCUSD | ✅ | 1ms | yahoo · 60579.99 · LIVE |
| Live quote ETHUSD | ✅ | 453ms | coingecko · 1623.1 · LIVE |
| Live quote EURUSD | ✅ | 0ms | yahoo · 1.1383 · LIVE |
| Live quote GCUSD | ✅ | 351ms | yahoo · 4070.7 · LIVE |
| Live quote CLUSD | ✅ | 1ms | yahoo · 67.6 · LIVE |
| Live quote TASI | ✅ | 198ms | yahoo · 10856.9 · LIVE |
| Paper portfolio reset | ✅ | 0ms | $100,000 virtual cash |
| AI analysis AAPL | ✅ | 1447ms | HOLD · score 40 · conf 0.63 |
| AI analysis TSLA | ✅ | 680ms | HOLD · score 55 · conf 0.71 |
| AI analysis MSFT | ✅ | 975ms | SELL · score 18 · conf 0.55 |
| AI analysis BTCUSD | ✅ | 930ms | HOLD · score 38 · conf 0.86 |
| AI analysis ETHUSD | ✅ | 1892ms | BUY · score 74 · conf 0.78 |
| AI analysis EURUSD | ✅ | 1141ms | SELL · score 20 · conf 0.71 |
| AI analysis GCUSD | ✅ | 1579ms | SELL · score 23 · conf 0.85 |
| AI analysis CLUSD | ✅ | 1065ms | SELL · score 29 · conf 0.94 |
| AI analysis TASI | ✅ | 354ms | SELL · score 23 · conf 0.7 |
| Risk Guardian ETHUSD | ✅ | 0ms | Allowed |
| Paper BUY ETHUSD | ✅ | 0ms | Filled qty 1 @ 1623.1 |
| Journal logging | ✅ | 0ms | 1 new entries (total 3) |
| Notifications | ✅ | 0ms | 1 new alerts (total 8) |
| Stop loss / take profit rules | ✅ | 0ms | SL 2% · TP 6% · simulation OK |
| Guardian Pro assessment | ✅ | 2ms | Blocked: Volatility. Reduce size or wait. |
| Chart candles | ✅ | 142ms | 21 bars · live |
| Portfolio manager state | ✅ | 1ms | Equity $100000 · drawdown 0% |
| Portfolio statistics | ✅ | 0ms | P&L 0 (0%) · WR 0% · risk 26/100 |
| Compliance lock | ✅ | 0ms | Paper only · broker execution OFF |
| Stress test 100 trades | ✅ | 0ms | 4 filled · 96 blocked/guarded |
| Emergency stop cleared | ✅ | 1ms | Max open positions (5) reached |

## Risk Guardian

- Stop loss: **2%**
- Take profit: **6%**
- Max open positions: **5**
- Daily loss limit: **3%**

## Dashboard URLs

- Providers: `/dashboard/providers`
- Paper: `/dashboard/paper`
- Journal: `/dashboard/journal`
- Alerts: `/dashboard/alerts`
