# Restaurant OS — Final Project Summary (Phase 1)

## Product

**Restaurant OS** (Menu OS) is a multi-tenant SaaS platform for restaurants in Saudi Arabia and the GCC. Phase 1 delivers a complete digital menu, operations dashboard, payments, and front-of-house tools.

## Production

| Item | Value |
|------|-------|
| URL | https://restaurant-os-nine.vercel.app |
| Version | 1.0.0 |
| Stack | Next.js 15, Prisma, PostgreSQL (Neon), NextAuth |
| Hosting | Vercel |
| Media | Cloudflare R2 |
| Payments | Moyasar |

## Key URLs

| Feature | URL |
|---------|-----|
| Dashboard | `/dashboard` |
| Reception | `/dashboard/reception` |
| Reservations | `/dashboard/reservations` |
| Customer history | `/dashboard/customers` |
| Staff | `/dashboard/staff` |
| Branding | `/dashboard/branding` |
| QR demo menu | `/r/menu-os-demo/table/menu-os-demo-t1` |

## Architecture Highlights

- **Multi-tenant:** Each restaurant isolated by `restaurantId`; staff scoped to creating restaurant.
- **Roles:** Owner, Admin, Manager, Reception, Waiter, Kitchen, Cashier, Platform Admin.
- **Permanent records:** Table sessions, visits, and reservations are soft-closed never deleted.
- **Privacy:** Customer phone visible only to owner/manager/reception staff; never on public QR menu.

## Test Coverage

85 automated production tests across smoke, reception, customer history, staff, and permissions suites — all passing.

## Team Demo Credentials

- **Owner:** `admin@menuos.sa` / `admin123456`
- **Demo table ID:** `cmqidxux90001uoo8be3ajk2d`

## Phase 2 (Not Started)

See `PHASE_1_COMPLETED.md` for deferred features.
