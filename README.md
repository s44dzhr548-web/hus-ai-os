# HUSAI-OS

**An AI Operating System that autonomously manages all your software projects.**

HUSAI-OS coordinates thirteen specialist agents to handle setup, development, deployment, security, QA, finance, marketing, research, and documentation—so you only step in for OTP, payments, KYC, and legal consent.

## Quick Start

1. **Read the orchestration guide:** [`HUSAI_AGENT.md`](./HUSAI_AGENT.md)
2. **Connect platforms (browser OAuth, no gh CLI):** [`docs/platform-connect.md`](./docs/platform-connect.md)
3. **Check project status:** [`docs/memory.md`](./docs/memory.md)
4. **Run platform check:** `node scripts/check-platform.js`

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   CEO Agent                      │
│         (prioritize · assign · report)           │
└─────────────────────┬───────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
 Setup · Dev · DB · API · Deploy · DevOps
 QA · Security · Finance · Marketing · Research · Docs
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
 GitHub            Vercel            Database
```

Full details: [`docs/architecture.md`](./docs/architecture.md)

## Agents

| Agent | Role |
|-------|------|
| [CEO](./agents/ceo-agent.md) | Orchestration, prioritization, reporting |
| [Setup](./agents/setup-agent.md) | Project bootstrap, integrations |
| [Developer](./agents/developer-agent.md) | Code, refactors, bug fixes |
| [Database](./agents/database-agent.md) | Schemas, migrations, performance |
| [API](./agents/api-agent.md) | External services, credentials |
| [Deployment](./agents/deployment-agent.md) | GitHub, Vercel, rollbacks |
| [DevOps](./agents/devops-agent.md) | CI/CD, monitoring |
| [QA](./agents/qa-agent.md) | Testing, quality reports |
| [Security](./agents/security-agent.md) | Secrets, audits |
| [Finance](./agents/finance-agent.md) | Subscriptions, costs |
| [Marketing](./agents/marketing-agent.md) | Launches, analytics |
| [Research](./agents/research-agent.md) | APIs, competitors, tech |
| [Documentation](./agents/documentation-agent.md) | Doc sync |

## Projects

| Project | Priority | Status |
|---------|----------|--------|
| [Restaurant OS](./projects/restaurant-os.md) | P1 | Ready for setup |
| [Trading AI](./projects/trading-ai.md) | P1 | Architecture phase |
| [Dropshipping Research](./projects/dropshipping-research.md) | P2 | Research phase |

## Documentation

| Doc | Purpose |
|-----|---------|
| [Architecture](./docs/architecture.md) | System design |
| [Roadmap](./docs/roadmap.md) | Timeline and milestones |
| [Standards](./docs/standards.md) | Code, git, deploy conventions |
| [Operating Rules](./docs/operating-rules.md) | Autonomy boundaries |
| [Memory](./docs/memory.md) | Living registry and task queue |

## Human Gates (Only These Stop Work)

| Gate | Example |
|------|---------|
| OTP | GitHub/Vercel 2FA login |
| Payment | Stripe live keys, paid API tiers |
| KYC | Business verification |
| Legal | Terms of service acceptance |

Everything else runs autonomously.

## Current Execution Plan

**Phase 0** ✅ — HUSAI-OS foundation (this repo)  
**Phase 1** 🔄 — Restaurant OS MVP → Setup Agent starts repo scaffold  
**Phase 2** — Trading AI paper trading (Research Agent parallel)  
**Phase 3** — Dropshipping Research platform  

See [`docs/roadmap.md`](./docs/roadmap.md) for full timeline.

## License

Private — account owner retains all rights.
