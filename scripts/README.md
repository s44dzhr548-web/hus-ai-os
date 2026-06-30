# HUSAI-OS Automation Scripts

## Milestone Workflow

After each milestone, agents run:

```powershell
# From repo root
.\scripts\milestone.ps1 -Message "feat: milestone description"
```

## What It Does
1. Runs Restaurant OS lint + build
2. Commits all changes (meta repo + prompts for nested repo)
3. Attempts push if remote configured
4. Logs milestone to `docs/memory.md`

## Platform Connect (requires owner OTP)

```powershell
.\scripts\connect-platforms.ps1
```

Opens/guides: GitHub repo create, Supabase link, Vercel deploy.

## Prerequisites
- Node.js 20+
- Git
- Optional: `gh` CLI, `vercel` CLI, Supabase CLI
