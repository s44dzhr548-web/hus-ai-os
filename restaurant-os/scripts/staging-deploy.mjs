#!/usr/bin/env node
/**
 * Staging deploy helper — NEVER deploys to production.
 * Usage: node scripts/staging-deploy.mjs
 */
console.log(`
╔══════════════════════════════════════════════════════════════╗
║  STAGING DEPLOY ONLY — Production is LOCKED for Fabrika      ║
╚══════════════════════════════════════════════════════════════╝

1. git checkout -b staging/marketing-ai
2. git push -u origin staging/marketing-ai
3. Vercel creates preview URL automatically
4. Set staging env vars (see .env.staging.example)
5. npm run db:migrate:deploy  (on STAGING database only)
6. Run tests:
   npm run test:fabrika-regression -- https://YOUR-STAGING-URL
   npm run test:marketing -- https://YOUR-STAGING-URL

Production URL (LOCKED): https://restaurant-os-nine.vercel.app
DO NOT merge to main until all tests PASS.

See docs/PRODUCTION_SAFETY.md
`);
