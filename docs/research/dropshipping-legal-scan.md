# Data Source Legal Scan — Dropshipping Research

**Agent:** Research Agent  
**Date:** 2026-06-30  
**Status:** Complete

## Policy Summary

| Source | API Allowed | Scraping | Verdict |
|--------|-------------|----------|---------|
| CJ Dropshipping | ✅ Official API | N/A | **Use API** |
| Spocket | ✅ Official API | N/A | **Use API** |
| AliExpress | ⚠️ Partner program only | ❌ Prohibited without license | API partner only |
| Amazon | ❌ Product Advertising API only | ❌ Strict ToS | Avoid for MVP |
| Google Trends | ⚠️ Unofficial endpoints | ❌ | Use pytrends server-side cautiously |
| Social media | Platform APIs only | ❌ Without permission | Defer |

## Rules for HUSAI-OS Agents
1. **API-first only** — no HTML scraping of marketplaces
2. Cache API responses per provider TTL
3. Store only aggregated niche scores, not full product catalogs
4. GDPR: no EU personal data without consent
5. Attribute data sources in reports

## Recommendation
Build niche scoring from:
- CJ Dropshipping API (product counts, margins)
- Manual competitor list (stored in DB, updated weekly)
- Optional: Google Trends via approved library (Phase 2)

## Next Steps
- API Agent: CJ sandbox integration when owner provides API key
- Developer Agent: Niche scoring algorithm (margin × demand × competition)
