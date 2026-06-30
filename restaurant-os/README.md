# Restaurant OS

All-in-one operating system for restaurants: menus, orders, kitchen display, inventory, and analytics.

Managed by [HUSAI-OS](../README.md).

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + Realtime) — pending setup
- Vercel deployment — pending setup

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in Supabase credentials after Setup Agent connects services
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

## Health Check

`GET /api/health` — returns service status for deployment probes.

## Environment Variables

See `.env.example` for required variables. Never commit `.env.local`.

## Project Spec

Full requirements: [../projects/restaurant-os.md](../projects/restaurant-os.md)
