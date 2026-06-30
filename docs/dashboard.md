# HUSAI-OS Platform Dashboard

Unified control plane for all HUSAI-OS projects and platform integrations.

## Local Development

```bash
cd husai-dashboard
npm install
npm run dev
```

Open http://localhost:3003

## Features

- **Project registry** — all apps from `projects/registry.json`
- **Live health checks** — pings each app's `/api/health` endpoint
- **GitHub status** — verifies monorepo connectivity
- **Supabase status** — checks husai-core availability
- **Project creation** — UI form + `scripts/create-project.js` automation

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Dashboard health |
| `/api/status` | GET | Full registry + platform status JSON |
| `/api/projects/create` | POST | Run project scaffold (local dev only) |

## Project Creation

### Via dashboard UI

1. Open http://localhost:3003/projects/new
2. Fill in slug, name, description
3. Submit — scaffolds folder, registry entry, docs, env files

### Via CLI

```bash
node scripts/create-project.js \
  --slug my-app \
  --name "My App" \
  --description "What it does" \
  --priority P2 \
  --port 3004 \
  --supabase
```

The script creates:

- Next.js app folder with health endpoint
- `projects/{slug}.md` specification
- Registry entry in `projects/registry.json`
- `.env.example` and `.env.local` (when husai-core env exists)
- `vercel.json` for deployment

## Deployment

```bash
cd husai-dashboard
npx vercel --prod --yes --scope hus707002h-7024s-projects
```

Production: https://husai-dashboard.vercel.app

## Architecture

The dashboard reads `projects/registry.json` from the monorepo root at runtime (local and Vercel). Platform status checks run server-side on each page load with 30–60s cache revalidation.

Project creation requires filesystem access to the monorepo and only works when running locally or via CLI.
