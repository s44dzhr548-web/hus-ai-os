# Dropshipping Research

## Status: Live (Production)
**Priority:** P2  
**Owner:** Research Agent → CEO Agent  
**Last Updated:** 2026-06-30  
**Production:** https://husai-dropshipping-research.vercel.app  
**Local:** `cd dropshipping-research && npm run dev` (port 3002)

## Overview
Automated dropshipping market research platform. Identifies profitable niches, analyzes suppliers, and tracks competitor pricing using AI agents.

## Goals
- Scrape and aggregate product trend data (within ToS)
- Score niches by margin, competition, and demand
- Recommend supplier integrations (AliExpress, CJ Dropshipping, Spocket)
- Generate weekly opportunity reports

## Tech Stack (Proposed)
| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14, Tailwind, shadcn/ui |
| Backend | Next.js API routes |
| Database | Supabase (Postgres) |
| Queue | Inngest or Trigger.dev |
| AI | OpenAI for analysis summaries |
| Deploy | Vercel |

## Registry Status

| Component | Status | Notes |
|-----------|--------|-------|
| GitHub | 🟢 Connected | Monorepo: s44dzhr548-web/hus-ai-os |
| Deployment | 🟢 Live | husai-dropshipping-research.vercel.app |
| Database | 🟢 Connected | husai-core Supabase |
| APIs | 🟡 Sample data | CJ Dropshipping API pending |
| Pending Work | Supplier API integration | Research complete |

## Pending Work
1. **Research Agent**: Complete supplier API comparison (Spocket vs CJ vs Zendrop)
2. **Research Agent**: Legal review of scraping policies per data source
3. **CEO Agent**: Prioritize vs restaurant-os and trading-ai
4. **Setup Agent**: Initialize repo after CEO go-ahead

## Key Integrations
- Product data APIs (TBD after research)
- Stripe (future — subscription model)
- Email reports (Resend)

## Success Metrics
- 10 validated niche reports in first month
- Supplier API connected with test orders in sandbox
- < $50/mo infra on free tiers during MVP

## Human Gates Anticipated
- Payment: Paid supplier APIs, ad research tools
- Legal: Marketplace ToS, GDPR if EU traffic

## Notes
Competitor landscape: Sell The Trend, Ecomhunt, Niche Scraper. Differentiate on AI-generated actionable briefs vs raw data dumps.
