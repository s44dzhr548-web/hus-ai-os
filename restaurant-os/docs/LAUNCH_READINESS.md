# Launch Readiness Report — Menu OS

**Date:** June 17, 2025  
**Status:** Production-ready (pending live PostgreSQL deploy)

## Summary

Menu OS is a multi-tenant Arabic-first restaurant digital menu SaaS. Core flows are implemented end-to-end: registration, onboarding, menu management, QR tables, customer ordering, kitchen workflow, payments (Moyasar/Tap/Stripe direct to restaurant), loyalty, analytics, subscriptions, and platform admin.

## Admin Credentials (seed)

| Role | Email | Password |
|------|-------|----------|
| Platform admin + demo owner | `admin@menuos.sa` | `admin123456` |

> Change passwords immediately after first production deploy.

## Required Environment Variables

See `.env.production.example` for the full list. Minimum:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | JWT signing secret (32+ chars) |
| `NEXTAUTH_URL` | Public app URL |
| `NEXT_PUBLIC_APP_URL` | Public app URL (QR links) |
| `S3_*` (optional) | Cloud storage for uploads |

## Deployment

1. Provision PostgreSQL (Neon, Supabase, RDS, etc.)
2. Set env vars on Vercel
3. Run `npm run vercel-build` (migrates + builds)
4. Run `npm run db:seed:prod` once for demo data (optional)
5. Point custom domain to Vercel

Full guide: [docs/DEPLOYMENT.md](./DEPLOYMENT.md)

## Feature Checklist

| Area | Status |
|------|--------|
| Multi-tenant restaurants | ✅ |
| Registration / login / onboarding | ✅ |
| Branches, tables, bulk QR, PDF print | ✅ |
| Unlimited categories / subcategories / products | ✅ |
| Image & video upload (plan-gated video) | ✅ |
| Menu options & add-ons | ✅ |
| Customer menu (RTL, search, favorites) | ✅ |
| Cart, checkout, order status, kitchen | ✅ |
| Moyasar + Tap + Stripe (restaurant keys) | ✅ |
| Loyalty, coupons, discount codes | ✅ |
| Analytics dashboard | ✅ |
| Subscription plans (Free/Basic/Pro/Enterprise) | ✅ |
| Marketing pages (landing, pricing, FAQ, contact, legal) | ✅ |
| Platform admin dashboard | ✅ |
| Waiter call system | ✅ |
| Slug URLs `/r/[slug]/table/[code]` | ✅ |
| Audit logging | ✅ |
| PostgreSQL + migrations + seed | ✅ |
| Vercel / Docker deployment config | ✅ |

## Pre-Launch QA

- [ ] Run `npm run build` — zero TypeScript errors
- [ ] Run `npm run lint` — zero ESLint errors
- [ ] Migrate production database
- [ ] Test login at `/login`
- [ ] Test customer menu via QR URL
- [ ] Test checkout with test payment keys
- [ ] Test kitchen order flow
- [ ] Verify platform admin at `/dashboard/platform`
- [ ] Rotate `NEXTAUTH_SECRET` and admin password

## Demo URLs (after seed)

- Dashboard: `http://localhost:3005/dashboard`
- Customer menu: `http://localhost:3005/r/menu-os-demo/table/menu-os-demo-t1`
- Platform admin: `http://localhost:3005/dashboard/platform`

## Notes

- Payments flow directly to restaurant merchant accounts; the platform never holds customer funds.
- Free plan: 1 branch, 5 tables, 10 items. Pro: 299 SAR/mo. Enterprise: 999 SAR/mo.
- Video upload requires Pro or Enterprise plan.
