# HUSAI Dashboard

**Priority:** Platform  
**Path:** `husai-dashboard/`  
**Port:** 3003  
**Production:** https://husai-dashboard.vercel.app

## Description

Unified control plane for HUSAI-OS. Displays project registry, live health checks, GitHub/Vercel/Supabase status, and project creation automation.

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS 4

## Commands

```bash
cd husai-dashboard
npm install
npm run dev
npm test
npm run build
```

## Deployment

```bash
npx vercel --prod --yes --scope hus707002h-7024s-projects
```

## Documentation

See [../docs/dashboard.md](../docs/dashboard.md)
