# HUSAI-OS Dashboard

Autonomous control plane — **zero manual work** for the account owner.

## Purpose

- View managed projects and health
- See Human Approval Gateway status (pending OAuth, payment, etc.)
- Submit new goals to CEO Agent (Project Factory)

The user is **not** asked to run commands, copy env vars, or configure Vercel/Supabase dashboards.

## Production

https://husai-dashboard.vercel.app

## For Agents

Dashboard reads Project Memory from `projects/registry.json` (bundled for Vercel).

API routes:
- `GET /api/status` — platform + project health
- `POST /api/projects/create` — invokes Project Factory (local control plane)

## Architecture

```
User goal → CEO → Orchestrator → Project Factory → Production URL
                      ↓
            Human Approval Gateway (only when blocked)
```

See [`architecture.md`](./architecture.md) and [`human-approval-gateway.md`](./human-approval-gateway.md).
