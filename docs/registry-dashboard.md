# HUSAI-OS Registry Dashboard

> **Note:** The live dashboard is at [husai-dashboard](../husai-dashboard/) (web UI).  
> This file is a static reference. See [memory.md](./memory.md) for current status.

## Production URLs

| App | URL | Health |
|-----|-----|--------|
| HUSAI Dashboard | https://husai-dashboard.vercel.app | `/api/health` |
| Restaurant OS | https://restaurant-os-nine.vercel.app | `/api/health` |
| Trading AI | https://trading-ai-beta.vercel.app | `/api/health` |
| Dropshipping | https://husai-dropshipping-research.vercel.app | `/api/health` |

## Platform

| Service | Status | Details |
|---------|--------|---------|
| GitHub | Connected | https://github.com/s44dzhr548-web/hus-ai-os |
| Supabase | Connected | husai-core · ap-south-1 |
| Vercel | Connected | Team: hus707002h-7024s-projects |

## Local Development

```bash
# Dashboard (port 3003)
cd husai-dashboard && npm run dev

# Restaurant OS (port 3000)
cd restaurant-os && npm run dev

# Trading AI (port 3001)
cd trading-ai && npm run dev

# Dropshipping (port 3002)
cd dropshipping-research && npm run dev
```

## Verification

```bash
npm run check
npm run test:all
npm run build:all
```

## Create New Project

```bash
node scripts/create-project.js --slug my-app --name "My App" --supabase
```

See [dashboard.md](./dashboard.md) for full documentation.
