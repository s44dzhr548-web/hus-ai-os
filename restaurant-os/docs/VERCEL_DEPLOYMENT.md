# Vercel Deployment — Menu OS

## 1. Prerequisites

- GitHub repository with Menu OS code
- PostgreSQL 16+ (Neon, Supabase, or Vercel Postgres recommended)
- S3-compatible object storage (Cloudflare R2 recommended)
- Custom domain with DNS access

## 2. PostgreSQL Setup (Production)

### Option A: Neon (recommended)

1. Create project at [neon.tech](https://neon.tech) — region: `aws-me-south-1` (Bahrain) or closest to KSA
2. Copy **pooled** connection string → `DATABASE_URL`
3. Copy **direct** connection string → `DIRECT_URL`
4. Append to pooled URL: `?sslmode=require&pgbouncer=true&connection_limit=1`

### Option B: Supabase

1. Create project → Settings → Database
2. Use **Transaction pooler** URI for `DATABASE_URL`
3. Use **Direct** URI for `DIRECT_URL`

### Option C: Vercel Postgres

1. Vercel dashboard → Storage → Create Database → Postgres
2. Link to project — `DATABASE_URL` and `POSTGRES_URL` auto-injected
3. Set `DIRECT_URL` to the non-pooling URL from Vercel storage settings

### Run migrations

Migrations run automatically on deploy via `vercel.json` buildCommand.

Manual migration (if needed):
```bash
DATABASE_URL="..." DIRECT_URL="..." npx prisma migrate deploy
```

## 3. Vercel Project Setup

1. **Import** repository at [vercel.com/new](https://vercel.com/new)
2. Framework preset: **Next.js** (auto-detected)
3. Root directory: `.`
4. Build command: leave default (uses `vercel.json`)
5. Region: **Dubai (dub1)** — configured in `vercel.json`

## 4. Environment Variables

Copy all variables from `.env.production.example` into:

**Vercel → Project → Settings → Environment Variables → Production**

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Pooled PostgreSQL URL |
| `DIRECT_URL` | Yes | Direct URL for migrations |
| `NEXTAUTH_URL` | Yes | `https://your-domain.com` |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as NEXTAUTH_URL |
| `STORAGE_PROVIDER` | Yes | Must be `s3` on Vercel |
| `S3_*` | Yes | R2/S3 credentials |
| `SEED_ENV` | Once | Remove after first seed |

## 5. First Deploy

```bash
git push origin main
```

Vercel will:
1. `npm install`
2. `prisma generate`
3. `prisma migrate deploy`
4. `next build`

## 6. Post-Deploy Seed

From local machine with production DB access:

```powershell
$env:DATABASE_URL="postgresql://..."
$env:DIRECT_URL="postgresql://..."
$env:SEED_ENV="production"
$env:NEXT_PUBLIC_APP_URL="https://your-domain.com"
npm run db:seed
```

Then **remove `SEED_ENV`** from Vercel environment variables.

## 7. Smoke Tests

| Test | URL / Action |
|------|-------------|
| Landing | `GET /` → 200 |
| Register | `POST /api/auth/register` |
| Login | `/login` → dashboard |
| QR menu | `/r/menu-os-demo/table/menu-os-demo-t1` |
| Platform admin | `/dashboard/platform` (admin@menuos.sa) |
| Payments settings | `/dashboard/payments` |

## 8. Rollback

Vercel → Deployments → select previous deployment → **Promote to Production**

Database rollbacks require manual `prisma migrate` — always backup before major releases.
