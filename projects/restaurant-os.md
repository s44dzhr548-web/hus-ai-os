# Restaurant OS

## Status: Spec Complete — Ready for Setup
**Priority:** P1  
**Owner:** CEO Agent  
**Last Updated:** 2026-06-30

## Overview
All-in-one operating system for restaurants: menu management, orders, kitchen display, inventory, staff scheduling, and basic analytics.

## Goals
- Digital menu with real-time availability
- Order flow: dine-in, takeaway, delivery hooks
- Kitchen display system (KDS) web app
- Inventory alerts and low-stock notifications
- Daily sales dashboard

## Tech Stack
| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14, React, TypeScript, Tailwind |
| Backend | Next.js API routes + Server Actions |
| Database | Supabase (Postgres + RLS multi-tenant) |
| Auth | Supabase Auth (email + magic link) |
| Realtime | Supabase Realtime (order updates) |
| Payments | Stripe (terminal + online — payment gate for live) |
| Deploy | Vercel |

## Registry Status

| Component | Status | Notes |
|-----------|--------|-------|
| GitHub | 🟡 Local only | Scaffold at `/restaurant-os`; remote repo pending OAuth |
| Deployment | ⬜ Not configured | CI workflow ready; Vercel link pending |
| Database | ⬜ Not configured | `.env.example` prepared |
| APIs | ⬜ Partial | Stripe sandbox planned |
| Pending Work | Supabase + Vercel connect → schema → auth | See below |

## Data Model (Draft)
```
restaurants
├── locations
├── menus → categories → items → modifiers
├── orders → order_items
├── inventory_items
├── staff → shifts
└── users (linked to auth)
```

## Pending Work
1. ~~**Setup Agent**: Scaffold Next.js app per standards~~ ✅ Done locally
2. **Setup Agent**: Push to GitHub remote (requires OAuth OTP)
3. **Setup Agent**: Create Supabase project + link env vars
4. **Setup Agent**: Create Vercel project linked to repo
5. **Database Agent**: Implement multi-tenant schema + RLS
6. **Developer Agent**: Auth flow + restaurant onboarding
7. **Developer Agent**: Menu CRUD + public menu page
8. **Developer Agent**: Order creation + KDS view
9. **API Agent**: Stripe Connect integration (sandbox)
10. **QA Agent**: E2E order flow tests
11. **Deployment Agent**: Staging → production pipeline

## Critical User Flows (QA)
- Owner creates restaurant and location
- Staff adds menu items
- Customer places order (dine-in)
- Kitchen sees order on KDS; marks complete
- Owner views daily sales summary

## Success Metrics
- Order placed to KDS latency < 2s
- 99.9% uptime during service hours
- Onboard new restaurant in < 15 minutes

## Human Gates Anticipated
- **Payment**: Stripe live mode, custom domain
- **OTP**: Supabase/Vercel/GitHub OAuth setup
- **Legal**: Stripe Connect agreement, food service disclaimers

## Notes
Phase 1 excludes delivery aggregator integrations (DoorDash API). Phase 2 adds webhook receivers for third-party orders.
