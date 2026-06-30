#!/usr/bin/env node
/**
 * Apply husai-core migration via Supabase Postgres REST (requires service role key).
 * Usage: node scripts/apply-migration.js
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env or restaurant-os/.env.local
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.join(__dirname, "..");
const envPath = path.join(root, "restaurant-os", ".env.local");

function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  if (!fs.existsSync(envPath)) {
    console.error("Missing restaurant-os/.env.local — run scripts/setup-husai-core.ps1 first");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const get = (k) => content.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
  return {
    url: get("NEXT_PUBLIC_SUPABASE_URL"),
    key: get("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

const migrationPath = path.join(
  root,
  "supabase/migrations/202606301200_husai_core_unified.sql"
);

const { url, key } = loadEnv();
if (!url || !key) {
  console.error("Supabase URL and service role key required");
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, "utf8");
const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!ref) {
  console.error("Invalid Supabase URL:", url);
  process.exit(1);
}

console.log(`Applying migration to husai-core (${ref})...`);
console.log("Use Supabase SQL Editor or: npx supabase db push after CLI login");
console.log("Migration file:", migrationPath);
console.log("Tables: profiles, restaurants, orders, market_bars, signals, paper_accounts, niche_reports");
