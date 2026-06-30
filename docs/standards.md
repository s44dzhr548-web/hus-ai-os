# HUSAI-OS Standards

## Operating Principle

**Zero manual work.** All setup, deploy, and configuration is performed by agents. Users only complete Human Approval Gateway actions (payment, OTP, OAuth, KYC, legal).

## Code Standards

### Language & Framework
- **TypeScript** strict mode enabled
- **Next.js 14+** App Router for web projects
- **React** functional components with hooks
- **Tailwind CSS** for styling; shadcn/ui for components

### File Structure (Application Repos)
```
src/
├── app/              # Routes (App Router)
├── components/       # UI components
├── lib/              # Utilities, clients
├── hooks/            # Custom hooks
├── types/            # Shared TypeScript types
└── server/           # Server-only modules
prisma/ or drizzle/   # Schema + migrations
tests/
├── unit/
├── integration/
└── e2e/
```

### Naming
| Item | Convention | Example |
|------|------------|---------|
| Files (components) | PascalCase | `OrderCard.tsx` |
| Files (utils) | kebab-case | `format-price.ts` |
| Variables/functions | camelCase | `getOrderById` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| Database tables | snake_case plural | `order_items` |
| API routes | kebab-case paths | `/api/order-items` |

### Code Quality
- No `any` without explicit comment justification
- Prefer early returns over deep nesting
- Keep functions focused; extract when > 40 lines
- Comments explain *why*, not *what*
- Match existing patterns before introducing new ones

## Git Standards

### Branches
- `main` — production-ready
- `staging` — pre-production (optional)
- `feat/*`, `fix/*`, `chore/*` — feature work

### Commits
Conventional commits:
```
feat: add kitchen display order view
fix: resolve race condition on order status
chore: update dependencies
docs: sync API reference
```

### Pull Requests
- One concern per PR
- Description includes: what, why, test plan
- Require CI pass + QA sign-off for merge
- No force-push to `main`

## Environment Standards

### Required Files
- `.env.example` — all vars documented, no values
- `.gitignore` — includes `.env`, `.env.local`, secrets

### Variable Naming
```
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # server only, never NEXT_PUBLIC_
```

## Database Standards
- UUID primary keys for public entities
- `created_at`, `updated_at` timestamps (UTC)
- Foreign keys with explicit `onDelete` behavior
- Indexes on all foreign keys and frequent query columns
- RLS enabled for multi-tenant Supabase projects

## API Standards
- RESTful routes or typed Server Actions
- Validate input with Zod
- Consistent error shape: `{ error: string, code?: string }`
- Rate limiting on public endpoints
- Never expose internal stack traces in production

## Testing Standards
| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit | Vitest | 80% new code |
| Integration | Vitest + test DB | Critical paths |
| E2E | Playwright | Revenue flows |

## Security Standards
- No secrets in source control (enforced by Security Agent)
- HTTPS everywhere
- Auth on all non-public routes
- CSRF protection on mutating forms
- Parameterized queries only
- Dependencies scanned daily

## Documentation Standards
- Every repo has README with: setup, env vars, scripts
- API changes update docs in same PR
- Changelog maintained for releases
- Agent and project specs updated in HUSAI-OS meta-repo

## Deployment Standards
- Preview deploy on every PR (Vercel)
- Production deploy only from `main` after CI + QA
- Health check endpoint: `GET /api/health`
- Rollback procedure documented per project

## Agent Execution Standards
- CEO receives goals; Orchestrator runs workflow without user input
- Log decisions in Project Memory (`docs/memory.md`)
- Stop only for Human Approval Gateway (payment, OTP, OAuth, KYC, legal)
- Never ask user to run commands or copy credentials
- Never fabricate credentials
