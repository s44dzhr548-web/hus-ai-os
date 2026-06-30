# Platform Connect (Browser OAuth — No GitHub CLI)

Use browser login only. Complete steps in order.

## 1. GitHub (browser)

1. Sign in: https://github.com/login *(should be open)*
2. Create repo: https://github.com/new?name=hus-ai-os
   - Visibility: Private or Public (your choice)
   - **Do not** add README, .gitignore, or license (repo already exists locally)
3. Copy the repo URL (e.g. `https://github.com/YOUR_USER/hus-ai-os.git`)
4. Tell the agent your repo URL — it will run:

```powershell
git remote add origin https://github.com/YOUR_USER/hus-ai-os.git
git push -u origin main
```

Windows **Git Credential Manager** will open a browser for GitHub OAuth when you push.

## 2. Supabase (browser)

1. Dashboard: https://supabase.com/dashboard *(should be open)*
2. New project → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
3. SQL Editor → run migrations:
   - `restaurant-os/supabase/migrations/202606300001_initial_schema.sql`
   - `trading-ai/supabase/migrations/202606300001_timeseries_schema.sql`
4. Paste keys into `restaurant-os/.env.local`

## 3. Vercel (browser OAuth)

1. Sign in: https://vercel.com/login *(should be open)*
2. Complete `npx vercel login` in terminal if prompted
3. Import GitHub repo → Root Directory: `restaurant-os` (repeat for other apps)
4. Add env vars from `.env.local`

## 4. Optional — Alpaca (Trading AI live data)

https://app.alpaca.markets/signup — paper account, no payment for MVP

---

**After each step**, tell the agent what you completed. Work continues automatically.
