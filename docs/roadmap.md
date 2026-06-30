# HUSAI-OS Roadmap

## Phase 0: Foundation ✅ (Current)
**Target:** 2026-06-30

- [x] Define multi-agent architecture
- [x] Create agent role definitions (13 agents)
- [x] Create project specs (3 projects)
- [x] Establish docs: architecture, standards, operating rules, memory
- [x] Publish README and HUSAI_AGENT orchestration guide

## Phase 1: Restaurant OS MVP
**Target:** 2026-07-31  
**Priority:** P1

| Week | Milestone | Lead Agent |
|------|-----------|------------|
| W1 | Repo + Supabase + Vercel scaffold | Setup |
| W1 | Multi-tenant schema + RLS | Database |
| W2 | Auth + restaurant onboarding | Developer |
| W2 | Menu CRUD + public menu | Developer |
| W3 | Orders + KDS realtime | Developer |
| W3 | CI pipeline + E2E tests | DevOps + QA |
| W4 | Staging deploy + QA sign-off | Deployment |
| W4 | Analytics + launch checklist | Marketing |

**Exit criteria:** Owner can onboard a restaurant, take orders, display on KDS, view daily sales.

## Phase 2: Trading AI (Paper Mode)
**Target:** 2026-08-31  
**Priority:** P1

| Week | Milestone | Lead Agent |
|------|-----------|------------|
| W1 | Broker API research + compliance brief | Research |
| W1 | Time-series schema | Database |
| W2 | Market data ingestion (Alpaca paper) | Developer + API |
| W3 | Backtest engine + reproducibility tests | Developer + QA |
| W4 | LLM summary dashboard | Developer |
| W4 | Security audit of key handling | Security |

**Exit criteria:** Paper backtest runs, signals logged, dashboard live on staging. No live trading.

## Phase 3: Dropshipping Research
**Target:** 2026-09-30  
**Priority:** P2

| Week | Milestone | Lead Agent |
|------|-----------|------------|
| W1 | Supplier API research + legal scan | Research |
| W2 | Niche scoring MVP | Developer |
| W3 | Weekly report automation | Developer + API |
| W4 | Public landing + analytics | Marketing |

**Exit criteria:** Automated weekly niche report generated from connected data sources.

## Phase 4: Platform Maturity
**Target:** 2026-Q4

- [ ] Cursor SDK agent per role (automated scheduling)
- [x] Unified dashboard for project registry
- [ ] Automated monthly finance reports
- [ ] Security audit automation across all repos
- [ ] Template generator for new projects (Setup Agent CLI)

## Phase 5: Scale
**Target:** 2027+

- Multi-account / team support
- Agent performance metrics and cost attribution
- Self-improving agent prompts from incident postmortems
- Optional live trading module (Trading AI) with full legal gate

## Prioritization Rules (CEO Agent)
1. Unblock production incidents (any project)
2. P1 project phase deadlines
3. Security findings (critical first)
4. P2 projects
5. Platform maturity tasks

## Success Metrics (OS Level)

| Metric | Target |
|--------|--------|
| Projects with live deployment | 3 by Q4 2026 |
| Autonomous task completion rate | > 95% |
| Human interrupts (non-OTP) | < 4/week |
| Registry accuracy | 100% |
| Doc freshness | < 7 days drift |
