# Trading AI

Paper trading research platform — auditable signals, reproducible backtests, risk dashboard.

Managed by [HUSAI-OS](../README.md).

## Features

- SMA crossover signal engine
- Reproducible backtest with hash verification
- Alpaca integration (falls back to mock data without keys)
- Time-series Supabase schema
- Regulatory disclaimer on all pages

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 3000) |
| `npm test` | Run Vitest suite |
| `npm run build` | Production build |

## API

- `GET /api/health` — status + paper account
- `GET /api/signals?symbols=AAPL,MSFT` — scan crossover signals
- `GET /api/backtest?symbol=AAPL` — run backtest

## Database

Schema: `supabase/migrations/202606300001_timeseries_schema.sql`

## Spec

[../projects/trading-ai.md](../projects/trading-ai.md)
