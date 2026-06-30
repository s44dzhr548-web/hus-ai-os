# HUSAI-OS Operating Rules

## Core Principle: Zero Manual Work

**The user never performs technical work.**

HUSAI-OS exists so the account owner states goals and approves only what platforms legally require. Agents execute everything else — folders, repos, deployments, env vars, tests, fixes, documentation.

### User Is Allowed To Do Only Four Things

| # | Action | When |
|---|--------|------|
| 1 | **Approve payment** | Subscription, domain, paid API tier |
| 2 | **Enter OTP / verification code** | 2FA, SMS, email verification |
| 3 | **Approve OAuth / login** | GitHub, Vercel, Supabase, broker consent screens |
| 4 | **Complete KYC or legal confirmation** | Identity verification, ToS acceptance |

### Never Ask The User To

- Run terminal commands
- Copy/paste API keys or env vars
- Configure Vercel root directories manually
- Create GitHub repos or push code
- Run migrations in SQL editors
- Fix build errors, tests, or deployments
- Choose stack details unless blocked by a human gate
- Confirm reversible technical decisions ("should I continue?")

When OAuth is required, **open the provider URL and pause** — do not instruct the user to perform follow-up technical steps after login. Agents resume automatically when the session is authorized.

---

## Human Approval Gateway

The **Human Approval Gateway** is the only intentional interruption surface. All escalations route through it.

See [`human-approval-gateway.md`](./human-approval-gateway.md).

---

## Autonomy Matrix

| Action | Autonomous? | Notes |
|--------|-------------|-------|
| Write/edit code | ✅ | Frontend, Backend, Database agents |
| Create folders & project structure | ✅ | Setup Agent + Project Factory |
| Create GitHub repo | ✅ | After spec exists; OAuth gate at login only |
| Connect Vercel / Supabase / Neon | ✅ | OAuth gate at login only |
| Generate & sync env files | ✅ | Never expose secrets in chat |
| Run tests, lint, build | ✅ | QA Agent |
| Deploy staging / production | ✅ | Deployment Agent |
| Rollback failed deploy | ✅ | Orchestrator retries first |
| Retry failed tasks | ✅ | Orchestrator (max 3 attempts) |
| Add paid subscription | ❌ | Payment gate |
| Accept legal ToS | ❌ | Legal gate |
| Live payment / trading keys | ❌ | Payment + legal gate |

---

## Agent Hierarchy

```
User Goal
    ↓
CEO Agent (prioritize, assign)
    ↓
Orchestrator Agent (workflow, retries, escalation)
    ↓
Specialist Agents (Setup, Frontend, Backend, Database, API, QA, Deployment, Security, …)
    ↓
Human Approval Gateway (OTP | Payment | OAuth | KYC | Legal) — only when blocked
```

---

## Escalation Format

```markdown
## APPROVAL REQUIRED — [GATE TYPE]
**Project:** name
**Blocked step:** one sentence
**Your action:** single action (e.g., approve OAuth at link)
**Agents resume:** automatically after approval
```

Do **not** include technical follow-up steps for the user.

---

## Credential Rules

1. Never fabricate credentials
2. Never commit secrets
3. Track credential **status** in Project Memory (connected / pending OAuth / missing) — never store secret values in docs
4. Agents use CLI + browser OAuth; user only completes provider login when session expired

---

## Continuous Operation

- Orchestrator selects the next step without user input
- Failed tasks retry before escalation
- Work resumes automatically when a gate clears
- Project Memory updated after every state change
