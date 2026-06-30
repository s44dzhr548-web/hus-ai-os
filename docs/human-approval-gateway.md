# Human Approval Gateway

The **Human Approval Gateway** is the only surface where HUSAI-OS interrupts the account owner.

## Principle

If an action does not require payment, OTP, OAuth consent, KYC, or legal confirmation — **agents must not ask the user**.

## Allowed Interruptions

| Gate | User action | Agent behavior after |
|------|-------------|----------------------|
| **Payment** | Approve charge in provider UI | Finance Agent logs cost; Setup/API continues |
| **OTP** | Enter code in provider UI | Orchestrator resumes blocked task |
| **OAuth** | Approve login/consent in browser | Setup/Deployment continues automatically |
| **KYC** | Complete identity verification | API Agent resumes integration |
| **Legal** | Accept terms in provider UI | Documentation Agent logs acceptance date |

## Forbidden Interruptions

Never present these as user tasks:

- "Run `npm install`"
- "Copy this key to `.env.local`"
- "Set Vercel root directory to …"
- "Push to GitHub"
- "Run migrations in Supabase SQL editor"
- "Should I deploy?"
- "Tell me when you've done X"

Replace with: **"Approval required — [gate type]"** and a single provider link.

## Escalation UI (Dashboard)

Pending approvals appear in the HUSAI Dashboard under **Pending Approvals** with:

- Gate type
- Provider name
- One-click link to provider
- Auto-resume notice

## Orchestrator Integration

```
Task fails (auth expired)
  → Orchestrator retry 1..3
  → Still blocked?
  → Create PendingApproval in Project Memory
  → Surface in Gateway / Dashboard
  → User completes gate
  → Orchestrator detects clearance (CLI re-auth / env present)
  → Resume pipeline — no user technical steps
```

## Logging

Every approval event is appended to `docs/memory.md`:

```markdown
| Date | Gate | Project | Resolved | Agent resumed |
```

Never log secret values.
