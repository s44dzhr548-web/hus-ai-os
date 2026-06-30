# Platform Connect (Agent Execution Guide)

> **Users do not follow this document.** Agents execute these steps autonomously. The user only completes OAuth/payment/KYC/legal screens when the Human Approval Gateway opens.

## Agent Protocol

When platform connection is required:

1. **Orchestrator** detects missing credential status in Project Memory
2. **Setup Agent** runs CLI commands
3. If session expired → **Gateway (OAuth)** — open provider URL for user approval only
4. After authorization → agents continue without user input
5. Update Project Memory credential status

## GitHub (Agent)

```bash
# Setup Agent — after user OAuth if needed
git remote set-url origin https://github.com/ORG/hus-ai-os.git
git push origin main
```

OAuth gate: https://github.com/login (user approves once per session)

## Supabase (Agent)

```bash
npx supabase login          # OAuth gate if expired
npx supabase link --project-ref REF
node scripts/auto-connect-supabase.js
```

OAuth gate: https://supabase.com/dashboard

## Vercel (Agent)

```bash
npx vercel login            # OAuth gate if expired
cd <app> && npx vercel link --scope TEAM
node ../scripts/vercel-env-sync.js
npx vercel --prod --yes --scope TEAM
```

Configure root directory via Vercel project settings API/CLI — **not** user dashboard instructions.

OAuth gate: https://vercel.com/login

## Environment Variables (Agent)

- Fetch keys via Supabase CLI or `.env.husai-core`
- Write `.env.local` in app folders
- Sync to Vercel via `scripts/vercel-env-sync.js`
- Never ask user to copy keys

## After Gate Clears

Orchestrator automatically:
- Retries failed step
- Updates Project Memory
- Continues pipeline

No "tell the agent when done" — agents detect session state.
