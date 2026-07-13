# Release Notes — Restaurant OS v1.0.0 (Phase 1)

**Production URL:** https://restaurant-os-nine.vercel.app  
**Version:** 1.0.0  
**Date:** July 9, 2026

## Summary

Phase 1 completes the core Restaurant OS platform: digital menu, operations dashboard, payments, subscriptions, reception & reservations, permanent customer history, and reception staff accounts.

## Phase 1 Modules

### Public & Customer
- Marketing homepage
- Customer QR menu (table-scoped)
- Hero video on branded menu
- WhatsApp ordering links
- Moyasar customer checkout (live + mock modes)

### Owner Dashboard
- Overview analytics
- Branding dashboard (logo, colors, hero)
- Menu management (categories, products, options, media)
- Tables & QR codes
- Orders & kitchen display
- Payments & Moyasar billing
- Subscriptions & platform billing
- Role-based permissions

### Reception & CRM
- Reception dashboard (walk-ins, table sessions, minimum spend)
- Reservations (create, approve, assign, convert to session)
- Permanent customer history (visits, reservations, CSV export)
- Customer privacy (phone hidden on public menu)

### Staff
- Staff management (`/dashboard/staff`)
- Reception role with scoped permissions
- Owner: create, disable, reset password, delete staff

## Production Test Results

| Suite | Result |
|-------|--------|
| Production verify | 20/20 PASS |
| Smoke test | 15/15 PASS |
| Reception & reservations | 13/13 PASS |
| Customer history | 13/13 PASS |
| Staff accounts | 11/11 PASS |
| Permissions | 13/13 PASS |
| **Total** | **85/85 PASS** |

## Deployment

- **Platform:** Vercel (`restaurant-os-nine.vercel.app`)
- **Database:** Neon PostgreSQL (19 migrations)
- **Storage:** Cloudflare R2
- **Payments:** Moyasar (live)

## Upgrade Notes

- Vercel Root Directory must be empty (repo root).
- Run `prisma migrate deploy` on deploy (configured in build command).
- Demo restaurant slug: `menu-os-demo`, table code: `menu-os-demo-t1`.
