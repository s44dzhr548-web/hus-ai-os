# Production Safety Lock — Fabrika Lounge & Live Customers

**Status: LOCKED** — Do not deploy to production without completing the full release checklist.

## Locked Production Version

| Field | Value |
|-------|--------|
| **Production URL** | https://restaurant-os-nine.vercel.app |
| **Locked commit (monorepo)** | `b4c2aee` |
| **Locked deployment** | `dpl_XYwKsSdRDF5NKFfVT4R9nGnDy6c8` |
| **Lock date** | 2026-07-11 |

## Rules (Non-Negotiable)

1. **Never develop directly on Production** — all new work on `staging/marketing-ai` branch.
2. **Never modify Fabrika's existing data** — no seed changes, no data migrations that touch customer rows.
3. **Never reset the database** — additive migrations only (`ALTER TABLE ADD`, new tables).
4. **Never delete customer data** — soft-delete only for marketing entities.
5. **Never interrupt Fabrika service** — zero-downtime deploys; rollback on failure.
6. **Safe migrations only** — reviewed in staging before production.
7. **Auto-rollback** — if deploy health checks fail, revert to locked deployment.
8. **Merge to Production only after** all tests pass + Fabrika regression PASS.

## Protected Workflows (Must Remain Unchanged)

- Reception (`/dashboard/reception`, `/api/reception/*`)
- Reservations (`/dashboard/reservations`, `/api/reservations/*`)
- Orders & Kitchen
- QR Menu & Public Menu
- Payments & Billing
- WhatsApp ordering links
- Customer History
- Staff accounts
- Branding & Hero Video

## Release Checklist

```bash
# 1. Run on STAGING only
npm run test:fabrika-regression -- https://STAGING_URL
npm run test:marketing -- https://STAGING_URL
npm run test:phase1:prod -- https://STAGING_URL

# 2. Verify build
npm run build

# 3. Deploy staging → verify → then production with rollback plan
```

## Rollback

```bash
npx vercel rollback dpl_XYwKsSdRDF5NKFfVT4R9nGnDy6c8 --yes
```
