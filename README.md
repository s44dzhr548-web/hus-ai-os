# HUSAI-OS

**An AI Operating System that autonomously manages all your software projects.**

HUSAI-OS coordinates thirteen specialist agents to handle setup, development, deployment, security, QA, finance, marketing, research, and documentation.

## Quick Start

```bash
# Platform dashboard (port 3003)
cd husai-dashboard && npm install && npm run dev

# Run all apps
cd restaurant-os && npm run dev    # port 3000
cd trading-ai && npm run dev         # port 3001
cd dropshipping-research && npm run dev  # port 3002

# Full platform audit
npm run check:all

# Create new project
npm run create:project "My App" "Description"
```

## Production URLs

| App | URL |
|-----|-----|
| **HUSAI Dashboard** | https://husai-dashboard.vercel.app |
| Restaurant OS | https://restaurant-os-nine.vercel.app |
| Trading AI | https://trading-ai-husai.vercel.app |
| Dropshipping Research | https://dropshipping-research.vercel.app |

**GitHub:** https://github.com/s44dzhr548-web/hus-ai-os

## Monorepo Structure

```
hus-ai-os/
├── husai-dashboard/     ← Platform control plane
├── restaurant-os/       ← Restaurant management (Supabase)
├── trading-ai/          ← Paper trading & backtests
├── dropshipping-research/ ← Niche scoring
├── projects/registry.json ← Central project registry
├── supabase/            ← husai-core migrations
├── agents/              ← 13 specialist agent definitions
└── scripts/             ← Automation & platform tools
```

## Vercel Deployment (Monorepo)

Each app is a separate Vercel project with **Root Directory** set:

| Vercel Project | Root Directory |
|----------------|----------------|
| husai-dashboard | `husai-dashboard` |
| restaurant-os | `restaurant-os` |
| trading-ai | `trading-ai` |
| dropshipping-research | `dropshipping-research` |

## Agents

| Agent | Role |
|-------|------|
| [CEO](./agents/ceo-agent.md) | Orchestration, prioritization |
| [Setup](./agents/setup-agent.md) | Project bootstrap |
| [Developer](./agents/developer-agent.md) | Code & bug fixes |
| [Database](./agents/database-agent.md) | Schemas & migrations |
| [Deployment](./agents/deployment-agent.md) | GitHub, Vercel |
| [QA](./agents/qa-agent.md) | Testing |
| [Security](./agents/security-agent.md) | Secrets & audits |

Full list in [`agents/`](./agents/).

## Documentation

| Doc | Purpose |
|-----|---------|
| [Architecture](./docs/architecture.md) | System design |
| [Memory](./docs/memory.md) | Living registry |
| [Roadmap](./docs/roadmap.md) | Timeline |
| [Registry Dashboard](./docs/registry-dashboard.md) | Dashboard spec |

## Human Gates

Only these require human approval: OTP, payment, KYC, legal consent.

## License

Private — account owner retains all rights.
