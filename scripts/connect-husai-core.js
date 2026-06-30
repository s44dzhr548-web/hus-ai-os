#!/usr/bin/env node
/**
 * Apply husai-core migration via direct Postgres connection.
 * Requires DATABASE_URL in .env.husai-core (Settings → Database → Connection string → URI)
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const root = path.join(__dirname, "..");
const envFile = path.join(root, ".env.husai-core");

if (!fs.existsSync(envFile)) {
  console.error("Create .env.husai-core from .env.husai-core.example");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envFile, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/202606301200_husai_core_unified.sql"),
  "utf8"
);

async function main() {
  const dbUrl = env.DATABASE_URL || env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL required in .env.husai-core");
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected to husai-core. Applying migration...");
  await client.query(migration);
  await client.end();
  console.log("Migration applied successfully.");

  // Write app env files
  const apps = [
    ["restaurant-os", "NEXT_PUBLIC_APP_URL=http://localhost:3000"],
    ["trading-ai", "NEXT_PUBLIC_APP_URL=http://localhost:3001\nALPACA_API_KEY=\nALPACA_API_SECRET="],
  ];

  for (const [app, extra] of apps) {
    const content = [
      `NEXT_PUBLIC_SUPABASE_URL=${env.NEXT_PUBLIC_SUPABASE_URL}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      `SUPABASE_SERVICE_ROLE_KEY=${env.SUPABASE_SERVICE_ROLE_KEY}`,
      extra,
    ].join("\n");
    fs.writeFileSync(path.join(root, app, ".env.local"), content + "\n");
    console.log(`Wrote ${app}/.env.local`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
