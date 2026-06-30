# HUSAI Dashboard

Unified platform dashboard for HUSAI-OS.

## Development

```bash
npm install
npm run dev
```

Runs on http://localhost:3003

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Run Vitest |
| `npm run lint` | ESLint |

## Documentation

- [Platform dashboard docs](../docs/dashboard.md)
- [Project registry](../projects/registry.json)
- [Living memory](../docs/memory.md)

## Deployment

```bash
npx vercel --prod --yes --scope hus707002h-7024s-projects
```
