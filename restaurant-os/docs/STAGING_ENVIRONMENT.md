# Staging Environment — Marketing AI Development

All Marketing AI development runs on **staging only**. Production (Fabrika Lounge) is locked.

## Staging URLs

| Environment | URL |
|-------------|-----|
| **Staging (branch preview)** | `https://restaurant-os-git-staging-marketing-ai-*.vercel.app` |
| **Local staging** | `http://localhost:3005` |
| **Production (LOCKED)** | `https://restaurant-os-nine.vercel.app` — **do not deploy here until QA passes** |

## Marketing Module URLs (Staging)

| Module | Path |
|--------|------|
| Marketing Dashboard | `/dashboard/marketing` |
| Campaign Manager | `/dashboard/marketing/campaigns` |
| AI Assistant | `/dashboard/marketing/assistant` |
| AI Creative Studio | `/dashboard/marketing/creative` |
| AI Video Creator | `/dashboard/marketing/video` |
| Ad Connections | `/dashboard/marketing/connections` |
| Customer Segments | `/dashboard/marketing/segments` |
| WhatsApp Marketing | `/dashboard/marketing/whatsapp` |
| Reports | `/dashboard/marketing/reports` |
| AI Forecast | `/dashboard/marketing/forecast` |

## Environment Variables (Staging)

Copy `.env.staging.example` to `.env.local` for local staging:

```env
DATABASE_URL=postgresql://...staging-db...   # Separate DB — NOT production
DIRECT_URL=postgresql://...staging-db...
NEXTAUTH_URL=http://localhost:3005
NEXT_PUBLIC_APP_URL=http://localhost:3005
MARKETING_TOKEN_SECRET=...32+ chars...
OPENAI_API_KEY=sk-...                        # Optional — templates used if absent
VERCEL_ENV=preview
DEPLOYMENT_ENV=staging
```

## Branch Workflow

```bash
git checkout -b staging/marketing-ai
# develop → test → push
git push -u origin staging/marketing-ai
# Vercel creates preview deployment automatically
```

## Database

- Use a **separate Neon branch** or staging database — never production `DATABASE_URL`.
- Migrations: `npm run db:migrate:deploy` on staging DB only.
- All marketing migrations are **additive** (new tables + optional columns).

## Deploy to Staging

```bash
node scripts/staging-deploy.mjs
```

Production deploy is blocked until `docs/PRODUCTION_SAFETY.md` checklist passes.
