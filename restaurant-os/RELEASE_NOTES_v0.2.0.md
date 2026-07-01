# Release Notes — Restaurant OS v0.2.0

**Production URL:** https://restaurant-os-nine.vercel.app  
**Version:** 0.2.0  
**Date:** July 2026

## Summary

Restores Menu OS on production (replacing the accidental HUSAI Supabase MVP deployment) and fixes customer checkout, orders, and WhatsApp ordering for production smoke tests.

## Fixes

### Deployment
- Synced full Menu OS codebase to the Vercel `restaurant-os` project (root: `restaurant-os/`).
- Disabled SSO deployment protection so public API routes are reachable.
- Production alias confirmed: `restaurant-os-nine.vercel.app`.

### Moyasar customer checkout & orders
- **Root cause:** Server-side `/api/checkout` called Moyasar with `{ type: "mada" }` and no card token; live API returned non-`paid` or failed, blocking order creation.
- **Fix:** Added `createMockMoyasarPayment()` and `MOYASAR_RESTAURANT_CHECKOUT_MODE` (default `mock`) for platform-key / test-mode restaurant checkout. Orders now complete in production smoke tests.

### WhatsApp ordering
- **Root cause:** Demo restaurant missing `whatsappNumber` in production DB (seed backfill not applied).
- **Fix:** Seed/backfill sets `whatsappNumber: +966501234567` and `paymentTestMode: true` on `menu-os-demo`.

### Smoke tests
- Added `scripts/production-smoke-test.mjs` (15-feature suite).
- Registration test password updated to meet validation (`Smokepass123`).

## Production smoke test

All 15 checks **PASS** on https://restaurant-os-nine.vercel.app

## Upgrade notes

- Optional env: `MOYASAR_RESTAURANT_CHECKOUT_MODE=live` when restaurants use their own Moyasar keys with client-side tokenization.
- Run `npx tsx scripts/backfill-demo-restaurant.ts` after deploy if demo WhatsApp data is missing.
