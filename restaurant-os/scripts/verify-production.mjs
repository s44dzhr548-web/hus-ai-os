/**
 * Static production readiness verification (no server required).
 * Run: node scripts/verify-production.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

const REQUIRED_ROUTES = [
  "/",
  "/pricing",
  "/register",
  "/login",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/dashboard",
  "/dashboard/platform",
  "/dashboard/onboarding",
  "/dashboard/tables",
  "/dashboard/payments",
  "/dashboard/subscription",
  "/menu/[tableId]",
  "/r/[slug]",
  "/r/[slug]/table/[tableCode]",
  "/checkout/[tableId]",
  "/order-status/[orderId]",
];

const REQUIRED_APIS = [
  "/api/auth/register",
  "/api/auth/[...nextauth]",
  "/api/subscription",
  "/api/checkout",
  "/api/tables",
  "/api/qr",
  "/api/qr/print",
  "/api/restaurants/payment-settings",
  "/api/public/menu/[tableId]",
  "/api/platform",
];

const REQUIRED_FILES = [
  "vercel.json",
  ".env.production.example",
  "prisma/schema.prisma",
  "prisma/migrations/20250617000000_init/migration.sql",
  "prisma/migrations/20250617120000_platform_features/migration.sql",
  "docs/VERCEL_DEPLOYMENT.md",
  "docs/DOMAIN_SETUP.md",
  "docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md",
  "src/lib/moyasar.ts",
  "src/lib/tap.ts",
  "src/lib/payments/index.ts",
  "src/lib/subscription-limits.ts",
  "src/lib/table-code.ts",
];

function walkAppRoutes(dir, base = "src/app") {
  const routes = [];
  if (!existsSync(dir)) return routes;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      routes.push(...walkAppRoutes(full, base));
    } else if (entry === "page.tsx" || entry === "page.ts") {
      const rel = relative(base, dir).replace(/\\/g, "/");
      routes.push("/" + (rel === "." ? "" : rel));
    }
  }
  return routes;
}

function walkApiRoutes(dir, base = "src/app/api") {
  const routes = [];
  if (!existsSync(dir)) return routes;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      routes.push(...walkApiRoutes(full, base));
    } else if (entry === "route.ts") {
      const rel = relative(base, dir).replace(/\\/g, "/");
      routes.push("/api/" + rel);
    }
  }
  return routes;
}

const pageRoutes = walkAppRoutes(join(ROOT, "src/app"));
const apiRoutes = walkApiRoutes(join(ROOT, "src/app/api"));

const missingRoutes = REQUIRED_ROUTES.filter((r) => !pageRoutes.includes(r));
const missingApis = REQUIRED_APIS.filter((r) => !apiRoutes.includes(r));
const missingFiles = REQUIRED_FILES.filter((f) => !existsSync(join(ROOT, f)));

const vercel = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
const envProd = readFileSync(join(ROOT, ".env.production.example"), "utf8");

const checks = {
  vercelBuildCommand: vercel.buildCommand?.includes("prisma migrate deploy"),
  vercelRegion: vercel.regions?.includes("dub1"),
  postgresProvider: schema.includes('provider  = "postgresql"'),
  directUrl: schema.includes("directUrl"),
  databaseUrlEnv: envProd.includes("DATABASE_URL"),
  directUrlEnv: envProd.includes("DIRECT_URL"),
  nextauthEnv: envProd.includes("NEXTAUTH_SECRET"),
  s3Storage: envProd.includes("STORAGE_PROVIDER") && envProd.includes("S3_BUCKET"),
  moyasarLib: existsSync(join(ROOT, "src/lib/moyasar.ts")),
  tapLib: existsSync(join(ROOT, "src/lib/tap.ts")),
  registrationApi: existsSync(join(ROOT, "src/app/api/auth/register/route.ts")),
  subscriptionApi: existsSync(join(ROOT, "src/app/api/subscription/route.ts")),
  qrUsesSlug: readFileSync(join(ROOT, "src/app/api/qr/route.ts"), "utf8").includes("menuUrlForTable"),
};

const passed = Object.values(checks).filter(Boolean).length;
const total = Object.keys(checks).length;

console.log("=== Menu OS Production Verification ===\n");
console.log(`Config checks: ${passed}/${total} passed\n`);

for (const [k, v] of Object.entries(checks)) {
  console.log(`  ${v ? "✓" : "✗"} ${k}`);
}

if (missingRoutes.length) {
  console.log("\nMissing page routes:", missingRoutes);
} else {
  console.log(`\n✓ All ${REQUIRED_ROUTES.length} required page routes exist`);
}

if (missingApis.length) {
  console.log("Missing API routes:", missingApis);
} else {
  console.log(`✓ All ${REQUIRED_APIS.length} required API routes exist`);
}

if (missingFiles.length) {
  console.log("Missing files:", missingFiles);
} else {
  console.log(`✓ All ${REQUIRED_FILES.length} required deployment files exist`);
}

console.log(`\nTotal page routes: ${pageRoutes.length}`);
console.log(`Total API routes: ${apiRoutes.length}`);

const score = Math.round(
  ((passed / total) * 0.4 +
    (missingRoutes.length === 0 ? 0.2 : 0) +
    (missingApis.length === 0 ? 0.2 : 0) +
    (missingFiles.length === 0 ? 0.2 : 0)) *
    100
);

console.log(`\nStatic readiness score: ${score}%`);

process.exit(missingRoutes.length || missingApis.length || missingFiles.length || passed < total ? 1 : 0);
