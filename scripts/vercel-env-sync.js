#!/usr/bin/env node
/** Push env vars from .env.husai-core to Vercel project in cwd */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const envFile = path.join(__dirname, "..", ".env.husai-core");
if (!fs.existsSync(envFile)) {
  console.error("Missing .env.husai-core");
  process.exit(1);
}

const vars = fs
  .readFileSync(envFile, "utf8")
  .split("\n")
  .filter((l) => l && !l.startsWith("#") && l.includes("="))
  .filter((l) => l.startsWith("NEXT_PUBLIC_") || l.startsWith("SUPABASE_SERVICE"));

for (const line of vars) {
  const [name, ...rest] = line.split("=");
  const value = rest.join("=").trim();
  try {
    execSync(`npx vercel env rm ${name} production --yes`, { stdio: "ignore" });
  } catch {}
  execSync(`echo ${JSON.stringify(value)} | npx vercel env add ${name} production`, {
    stdio: "inherit",
    shell: true,
  });
  console.log(`Set ${name} on Vercel`);
}
