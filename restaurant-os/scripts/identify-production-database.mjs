/**
 * Identify the database behind DATABASE_URL (no secrets printed).
 * Usage: DATABASE_URL=... node scripts/identify-production-database.mjs
 */
function parseDbUrl(url) {
  try {
    const u = new URL(url);
    return {
      provider: u.hostname.includes("neon") ? "Neon PostgreSQL" : "PostgreSQL",
      host: u.hostname,
      port: u.port || "5432",
      database: u.pathname.replace(/^\//, "") || "(default)",
      user: u.username ? `${u.username.slice(0, 2)}***` : "(none)",
      ssl: u.searchParams.get("sslmode") || (u.protocol === "postgresql:" ? "default" : "n/a"),
    };
  } catch {
    return null;
  }
}

const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!url) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "DATABASE_URL not set",
        hint: "Production uses Vercel env DATABASE_URL (Neon pooled URI). Pull with: vercel env pull .env.production.local --environment=production",
        productionAppUrl: "https://restaurant-os-nine.vercel.app",
      },
      null,
      2
    )
  );
  process.exit(1);
}

const info = parseDbUrl(url);
console.log(
  JSON.stringify(
    {
      ok: true,
      productionAppUrl: "https://restaurant-os-nine.vercel.app",
      environmentSource: process.env.VERCEL_ENV ? "vercel-runtime" : "local-env",
      database: info,
      note: "Full connection string is never logged.",
    },
    null,
    2
  )
);
