# HUSAI-OS Memory

> Living project registry and decision log. Updated by all agents after milestones, escalations, and status changes.

**Last Updated:** 2026-06-30  
**Updated By:** CEO Agent + Setup + Database + Developer + Documentation Agents

---

## Project Registry

| Project | Priority | GitHub | Deployment | Database | APIs | Status |
|---------|----------|--------|------------|----------|------|--------|
| [Restaurant OS](../projects/restaurant-os.md) | P1 | 🟡 Local git | ⬜ Pending OAuth | 🟡 Schema ready | 🟡 Routes built | 🟡 Awaiting Supabase |
| [Trading AI](../projects/trading-ai.md) | P1 | ⬜ Not started | ⬜ Not started | ⬜ Not started | 🟡 Research done | 🟡 Research complete |
| [Dropshipping Research](../projects/dropshipping-research.md) | P2 | ⬜ Not started | ⬜ Not started | ⬜ Not started | 🟡 Research done | 🟡 Research complete |

### Legend
- ✅ Active / connected / healthy
- 🟡 In progress or partial
- ⬜ Not started
- 🔴 Blocked

---

## Active Task Queue

### P1 — Restaurant OS
| ID | Task | Agent | Status |
|----|------|-------|--------|
| T-001 | Scaffold Next.js app | Setup | ✅ Complete |
| T-005 | Multi-tenant schema + RLS SQL | Database | ✅ Complete |
| T-006 | Auth (login/signup/callback) | Developer | ✅ Complete |
| T-007 | Onboarding flow | Developer | ✅ Complete |
| T-008 | REST APIs (restaurants, menus, orders) | API | ✅ Complete |
| T-009 | Owner dashboard + menu + orders + KDS | Developer | ✅ Complete |
| T-010 | Public menu page | Developer | ✅ Complete |
| T-002 | Push to GitHub remote | Setup | 🔴 Blocked — OAuth (gh CLI not installed) |
| T-003 | Create Supabase project + env vars | Setup | 🔴 Blocked — OAuth OTP |
| T-004 | Deploy to Vercel | Deployment | 🔴 Blocked on T-002, T-003 |

### P1 — Trading AI
| ID | Task | Agent | Status |
|----|------|-------|--------|
| T-101 | Broker API comparison brief | Research | ✅ Complete |
| T-102 | Regulatory disclaimer requirements | Research | ✅ Complete |
| T-103 | Time-series schema design | Database | Pending |

### P2 — Dropshipping Research
| ID | Task | Agent | Status |
|----|------|-------|--------|
| T-201 | Supplier API comparison | Research | ✅ Complete |
| T-202 | Scraping policy legal scan | Research | Pending |

---

## Milestones Completed (2026-06-30)

### M1 — HUSAI-OS Foundation
- 13 agent definitions, docs, projects, orchestration guide

### M2 — Restaurant OS Core
- Supabase migration (profiles, restaurants, menus, orders, RLS)
- Auth pages + middleware
- REST API layer with Zod validation
- Dashboard: overview, menu manager, orders, KDS
- Public menu at `/menu/[slug]`
- CI workflow + Vercel config
- Build verified ✅

### M3 — Research Layer
- Trading AI: Alpaca recommended, compliance brief
- Dropshipping: CJ Dropshipping recommended for MVP

---

## Escalations

### ESCALATION — OTP / OAuth
**Project:** Restaurant OS + HUSAI-OS meta repo  
**Agent:** Setup + Deployment  
**Action blocked:** GitHub push, Supabase connect, Vercel deploy  
**Owner action:**
1. Create GitHub repo `hus-ai-os` (or approve repo name)
2. Provide Supabase project URL + anon key + service role key
3. Log in to Vercel and link repo (or install `gh` + `vercel` CLI)
**Workaround:** All code ready locally; runs with `npm run dev` after `.env.local`

---

## Subscriptions & Costs

| Service | Project | Tier | Monthly Cost | Renewal |
|---------|---------|------|--------------|---------|
| — | — | Free tiers only | $0 | — |

---

## Decision Log

### 2026-06-30 — Restaurant OS MVP Feature Set
**Agent:** CEO + Developer  
**Decision:** Ship auth, onboarding, menu CRUD, orders, KDS, public menu in one milestone.  
**Rationale:** Core restaurant loop complete without Stripe (deferred).

### 2026-06-30 — Alpaca for Trading AI
**Agent:** Research  
**Decision:** Paper trading via Alpaca Markets API.  
**See:** [docs/research/trading-ai-broker-apis.md](./research/trading-ai-broker-apis.md)

---

## Recent Activity

| Date | Agent | Action |
|------|-------|--------|
| 2026-06-30 | Database | Published Supabase migration with RLS |
| 2026-06-30 | Developer | Built dashboard, auth, APIs |
| 2026-06-30 | Research | Completed 3 research briefs |
| 2026-06-30 | DevOps | Root + app CI workflows |
| 2026-06-30 | Documentation | API docs, memory sync |

---

## Notes for Next Session
1. Owner provides Supabase credentials → apply migration → app goes live
2. Push both repos to GitHub → connect Vercel
3. Trading AI: begin time-series schema + Alpaca ingestion
