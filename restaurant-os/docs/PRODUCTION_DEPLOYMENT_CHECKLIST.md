# Production Deployment Checklist — Menu OS

Use this checklist before and after going live.

## Pre-Deploy

- [ ] GitHub repository is up to date
- [ ] `npm run build` passes locally (zero TS errors)
- [ ] PostgreSQL production instance created (Neon / Supabase / Vercel Postgres)
- [ ] `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) obtained
- [ ] S3/R2 bucket created for media uploads
- [ ] `NEXTAUTH_SECRET` generated (`openssl rand -base64 32`)
- [ ] `.env.production.example` values copied to Vercel dashboard
- [ ] Domain purchased and DNS access confirmed

## Vercel Deploy

- [ ] Project imported from GitHub
- [ ] Region set to Dubai (`dub1`) via `vercel.json`
- [ ] All production env vars set in Vercel
- [ ] First deploy succeeded (check build logs for `prisma migrate deploy`)
- [ ] No migration errors in deploy logs

## Post-Deploy Setup

- [ ] Run `npm run db:seed` against production DB (once)
- [ ] Change admin password (`admin@menuos.sa`)
- [ ] Remove `SEED_ENV` from Vercel env vars
- [ ] Custom domain added and SSL active
- [ ] `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` updated to production domain
- [ ] Redeploy after domain/env update

## Route Verification (all must return 200 or expected redirect)

- [ ] `/` — landing page
- [ ] `/pricing` — pricing page
- [ ] `/register` — registration form
- [ ] `/login` — login form
- [ ] `/faq` — FAQ page
- [ ] `/contact` — contact page
- [ ] `/privacy` — privacy policy
- [ ] `/terms` — terms of service
- [ ] `/dashboard` — redirects to login if unauthenticated
- [ ] `/dashboard/platform` — platform admin (authenticated)
- [ ] `/r/menu-os-demo/table/menu-os-demo-t1` — customer menu

## QR Flow (end-to-end)

- [ ] Create branch and tables in dashboard
- [ ] Bulk create tables generates `tableCode` and `qrCode`
- [ ] QR preview at `/api/qr?tableId=...` returns slug-based `menuUrl`
- [ ] Scan QR → opens customer menu on mobile
- [ ] Bulk PDF print at `/api/qr/print?branchId=...` downloads correctly
- [ ] Menu loads categories, products, images

## Registration Flow

- [ ] `/register` form submits successfully
- [ ] `POST /api/auth/register` returns 201
- [ ] New user can log in at `/login`
- [ ] Redirected to `/dashboard/onboarding`
- [ ] Restaurant created with FREE/TRIAL subscription
- [ ] First branch created automatically

## Subscription Plans

- [ ] `/dashboard/subscription` shows current plan and limits
- [ ] `GET /api/subscription` returns usage vs limits
- [ ] Free plan blocks >5 tables, >10 items
- [ ] Plan upgrade via `PUT /api/subscription` works
- [ ] Pro plan enables video upload
- [ ] Pricing page shows correct prices (99 / 299 / 999 SAR)

## Payment Integration Readiness

- [ ] `/dashboard/payments` — owner can save Moyasar keys
- [ ] `/dashboard/payments` — owner can save Tap keys
- [ ] Test mode toggle works (`paymentTestMode`)
- [ ] `GET /api/checkout?tableId=...` returns correct provider + publishable key
- [ ] Checkout with placeholder keys completes (mock mode)
- [ ] Real Moyasar keys: test transaction in Moyasar sandbox
- [ ] Real Tap keys: test transaction in Tap sandbox
- [ ] Payments credited to restaurant account (not platform)

## Security

- [ ] `NEXTAUTH_SECRET` is unique and not committed to git
- [ ] Restaurant secret keys masked in API responses
- [ ] Dashboard routes protected by middleware
- [ ] Platform admin requires `isPlatformAdmin`
- [ ] HTTPS enforced on production domain

## Monitoring (recommended)

- [ ] Vercel Analytics enabled
- [ ] Error tracking (Sentry) configured (optional)
- [ ] Database backups enabled (Neon/Supabase auto-backup)
- [ ] Uptime monitor on `/` and `/api/auth/session`

## Launch Sign-Off

- [ ] Admin credentials rotated
- [ ] Demo restaurant tested end-to-end
- [ ] Support email configured (`support@menuos.sa`)
- [ ] Team trained on dashboard workflows

**Signed off by:** _______________ **Date:** _______________
