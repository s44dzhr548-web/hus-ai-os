# Project Memory

Project Memory is the persistent state layer for HUSAI-OS. Agents read and write it; the user never maintains it manually.

## Stores

| Store | Path | Purpose |
|-------|------|---------|
| Human-readable | `docs/memory.md` | Registry, approvals, activity log |
| Machine-readable | `projects/registry.json` | Dashboard + automation |
| Bundled copy | `husai-dashboard/src/data/registry.json` | Vercel deployment sync |

## Per-Project Record

```json
{
  "slug": "restaurant-os",
  "name": "Restaurant OS",
  "status": "live",
  "productionUrl": "https://restaurant-os-nine.vercel.app",
  "credentials": {
    "github": "connected",
    "vercel": "connected",
    "supabase": "connected",
    "stripe": "not_required"
  },
  "deployments": {
    "latest": "2026-06-30T16:34:00Z",
    "vercelProject": "restaurant-os",
    "health": "ok"
  },
  "errors": [],
  "costs": {
    "monthlyUsd": 0,
    "notes": "Free tier"
  },
  "pendingApprovals": []
}
```

## Credential Status Values

| Value | Meaning |
|-------|---------|
| `connected` | Agent verified; CLI/API works |
| `pending_oauth` | Waiting for user OAuth at Gateway |
| `pending_payment` | Waiting for payment approval |
| `pending_kyc` | Waiting for KYC |
| `pending_legal` | Waiting for ToS acceptance |
| `not_required` | Service not used |
| `error` | Agent investigating / retrying |

**Never store** API keys, tokens, or passwords in Project Memory.

## Global Sections (memory.md)

1. **Project Registry** — high-level status table
2. **Pending Approvals** — open Human Gateway items
3. **Platform Credentials** — husai-core, GitHub org, Vercel team status
4. **Deployments** — last production deploy per app
5. **Errors** — active failures Orchestrator is handling
6. **Costs** — monthly burn summary
7. **Activity Log** — audit trail

## Update Rules

- CEO Agent: registry rows after milestone
- Orchestrator Agent: errors, retries, pending approvals
- Setup Agent: credential status changes
- Deployment Agent: deployment timestamps + URLs
- Finance Agent: cost figures
- Security Agent: exposure incidents (no secret details)

Updates happen automatically during agent execution — not as a user task.
