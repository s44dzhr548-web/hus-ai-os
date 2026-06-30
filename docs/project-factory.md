# Project Factory

The **Project Factory** turns a project idea into a live URL with zero user technical work.

## Trigger

- CEO Agent receives a user goal
- Orchestrator invokes the factory pipeline
- Dashboard **New Project** form submits to CEO queue (agents execute; user does not run scripts)

## Pipeline (Autonomous)

| Step | Agent | Action |
|------|-------|--------|
| 1 | CEO | Write `/projects/{slug}.md` spec |
| 2 | Setup | Create folder + Next.js scaffold |
| 3 | Setup | `git` commit in monorepo |
| 4 | Setup | Create/link GitHub repo (OAuth if needed) |
| 5 | Setup | Create Vercel project + root directory |
| 6 | Setup | Connect Supabase/Neon or husai-core (OAuth if needed) |
| 7 | Setup | Generate `.env.example` + `.env.local` |
| 8 | Database | Schema + migrations |
| 9 | Backend | API routes + server logic |
| 10 | Frontend | Pages + components |
| 11 | QA | `npm test` + `npm run build` |
| 12 | Security | Secret scan |
| 13 | Deployment | Production deploy + health check |
| 14 | CEO | Update Project Memory; return production URL |

## Automation Entry Point

```bash
# Invoked by Orchestrator / Setup Agent — not by the user
node scripts/create-project.js \
  --slug my-app \
  --name "My App" \
  --description "What it does" \
  --priority P2 \
  --port 3004 \
  --supabase
```

Post-scaffold agents continue with feature work per spec.

## OAuth Gates (Expected)

| Service | Gate | User sees |
|---------|------|-----------|
| GitHub | OAuth | Browser login once per session |
| Vercel | OAuth | Browser login once per session |
| Supabase | OAuth | Browser login once per session |

After approval, agents run all CLI commands. User is not asked to configure dashboards.

## Output

```json
{
  "slug": "my-app",
  "productionUrl": "https://my-app.vercel.app",
  "github": "https://github.com/org/hus-ai-os/tree/main/my-app",
  "status": "live"
}
```

## Failure Handling

- Orchestrator retries each step up to 3 times
- Transient network errors: auto-retry
- Auth expired: Human Approval Gateway (OAuth)
- Paid tier required: Human Approval Gateway (Payment)
- After success: errors cleared in Project Memory
