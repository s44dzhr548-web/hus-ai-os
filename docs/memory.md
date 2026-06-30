# HUSAI-OS Memory

> Living project registry and decision log.

**Last Updated:** 2026-06-30  
**Updated By:** CEO + Developer + Database + Research + QA Agents

---

## Project Registry

| Project | Priority | GitHub | Deployment | Database | APIs | Status |
|---------|----------|--------|------------|----------|------|--------|
| [Restaurant OS](../projects/restaurant-os.md) | P1 | 🟡 Local git | ⬜ OAuth | 🟡 Schema ready | 🟡 Built | 🟡 Awaiting Supabase |
| [Trading AI](../projects/trading-ai.md) | P1 | 🟡 Local git | ⬜ OAuth | 🟡 Schema ready | 🟡 Mock+Alpaca | 🟡 MVP built |
| [Dropshipping Research](../projects/dropshipping-research.md) | P2 | 🟡 Local module | ⬜ — | ⬜ — | 🟡 Scoring lib | 🟡 Core logic done |

---

## Active Task Queue

### Restaurant OS
| ID | Task | Status |
|----|------|--------|
| T-011 | Settings page + Vitest tests | ✅ Complete |
| T-002 | GitHub push | 🔴 OAuth |
| T-003 | Supabase connect | 🔴 OTP |
| T-004 | Vercel deploy | 🔴 OAuth |

### Trading AI
| ID | Task | Status |
|----|------|--------|
| T-103 | Time-series schema | ✅ Complete |
| T-104 | Backtest engine + tests | ✅ Complete |
| T-105 | Signals API + dashboard | ✅ Complete |
| T-106 | Alpaca live data | 🔴 API keys optional |

### Dropshipping
| ID | Task | Status |
|----|------|--------|
| T-202 | Legal scan | ✅ Complete |
| T-203 | Niche scoring module + tests | ✅ Complete |
| T-204 | Full Next.js app | Pending |

---

## Milestones (2026-06-30)

### M4 — Trading AI MVP (local)
- Time-series Supabase migration
- SMA crossover strategy + backtest engine (4 tests)
- `/api/signals`, `/api/backtest`, dashboard with disclaimer
- Mock Alpaca fallback

### M5 — Dropshipping + QA
- Niche scoring algorithm (2 tests)
- Legal policy scan documented
- Restaurant OS: settings page, validator tests

---

## Escalations

### OPEN — Platform OAuth (browser, no gh CLI)

**Guide:** [platform-connect.md](./platform-connect.md)

| Step | Action | Status |
|------|--------|--------|
| GitHub login | https://github.com/login | 🟡 Browser opened |
| Create repo | https://github.com/new?name=hus-ai-os | 🟡 Awaiting user |
| Git push | `git remote add origin URL` then push (Credential Manager OAuth) | ⬜ Pending repo URL |
| Supabase | https://supabase.com/dashboard → keys + SQL migrations | 🟡 Browser opened |
| Vercel | https://vercel.com/login then `npx vercel login` | 🟡 Browser opened |

**Tell agent when done:**
- GitHub repo URL → agent pushes automatically
- Supabase keys → agent configures `.env.local`
- Vercel logged in → agent deploys

### OPTIONAL — Alpaca Paper API
**Blocked:** Live market data (mock works without keys)  
**Owner action:** Alpaca paper account → `ALPACA_API_KEY` + `ALPACA_API_SECRET` in `.env.local`

---

## Test Status (local)

| Project | Tests | Build |
|---------|-------|-------|
| restaurant-os | 2 ✅ | ✅ |
| trading-ai | 4 ✅ | ✅ |
| dropshipping-research | 2 ✅ | N/A (module) |

---

## Recent Activity

| Date | Agent | Action |
|------|-------|--------|
| 2026-06-30 | Developer | Trading AI full MVP scaffold |
| 2026-06-30 | Database | Trading AI timeseries migration |
| 2026-06-30 | Research | Dropshipping legal scan |
| 2026-06-30 | QA | 8 tests across 3 projects |
| 2026-06-30 | Developer | Restaurant OS settings page |
