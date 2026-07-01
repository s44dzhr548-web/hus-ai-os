# Menu OS

Arabic-first digital menu SaaS for restaurants. QR ordering, direct payments, kitchen dashboard, and analytics.

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Open **http://localhost:3005**

| | |
|---|---|
| Admin | admin@menuos.sa / admin123456 |
| Register | /register |
| Pricing | /pricing |

## Features

- Restaurant registration & onboarding
- Subscription plans with enforced limits
- Unlimited categories & subcategories
- Menu items with images, videos, discounts
- QR codes per table (bulk create & PDF export)
- Customer menu (Arabic/English, search, favorites)
- Direct payment to restaurant (Moyasar / Tap / Stripe)
- Orders, kitchen, analytics dashboard

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3005 |
| `npm run build` | Production build |
| `npm run db:seed` | Seed demo restaurant |
| `npm run db:push` | Sync schema to DB |
| `npm run db:studio` | Prisma Studio |

## Docs

- [Database Setup](docs/DATABASE_SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Production Checklist](docs/PRODUCTION_CHECKLIST.md)

## Stack

Next.js 15 · TypeScript · Tailwind CSS · Prisma · SQLite/PostgreSQL · NextAuth
