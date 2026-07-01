# Database Setup — Menu OS

## Local Development (SQLite)

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Push schema and generate client:
   ```bash
   npm run db:push
   npm run db:generate
   ```

3. Seed demo data:
   ```bash
   npm run db:seed
   ```

4. Open Prisma Studio (optional):
   ```bash
   npm run db:studio
   ```

## Production (PostgreSQL)

1. Create a PostgreSQL database.

2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Set `DATABASE_URL` in production environment.

4. Run migrations:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

## Demo Credentials

| Field | Value |
|-------|-------|
| Email | admin@menuos.sa |
| Password | admin123456 |

## Schema Overview

- **User** — platform accounts
- **Restaurant** — tenant with payment keys
- **Branch** — physical locations
- **DiningTable** — tables with QR links
- **MenuCategory / MenuItem** — nested menu
- **Order / Payment** — customer orders
- **Subscription** — SaaS plan limits
