# Deployment Guide — Menu OS (Production)

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Domain with HTTPS
- (Optional) S3/R2 for media storage

---

## Option A: Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables from `.env.production.example`:
   - `DATABASE_URL` — Vercel Postgres or external PostgreSQL
   - `NEXTAUTH_URL` — `https://your-domain.com`
   - `NEXTAUTH_SECRET` — random 32+ char string
   - `NEXT_PUBLIC_APP_URL` — `https://your-domain.com`
   - `STORAGE_PROVIDER=s3` + S3 credentials (Vercel blob or R2 recommended)
4. Deploy — `vercel.json` runs `prisma migrate deploy` automatically
5. Seed production data:
   ```bash
   SEED_ENV=production npm run db:seed
   ```

## Option B: VPS / Docker

1. Clone repo on server
2. Copy `.env.production.example` → `.env`
3. Run:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. App available on port 3005 (mapped from container 3000)
5. Put Nginx/Caddy in front for HTTPS and custom domains

## Option C: Local PostgreSQL (Development)

```bash
docker compose up -d          # starts PostgreSQL on 5432
cp .env.example .env
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

---

## Database Migration

Initial migration: `prisma/migrations/20250617000000_init/`

```bash
npx prisma migrate deploy     # production
npx prisma migrate dev        # development
```

---

## Custom Domain (Restaurant White-Label)

1. Restaurant owner sets `customDomain` in `/dashboard/settings`
2. Add CNAME: `menu.restaurant.com` → your platform domain
3. Configure reverse proxy / Vercel domain alias

---

## Post-Deploy Checklist

See `docs/PRODUCTION_CHECKLIST.md`
