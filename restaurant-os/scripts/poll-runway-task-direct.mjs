/**
 * Poll Runway task status directly (read-only, no DB writes).
 * Usage: node scripts/poll-runway-task-direct.mjs <taskId> [restaurantId]
 */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createDecipheriv } from "crypto";

loadMigrateEnv();

function loadLocalSecrets() {
  for (const name of [".env.vercel.prod", ".env.local", ".env.production.local"]) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*(INTEGRATION_ENCRYPTION_KEY|MARKETING_TOKEN_SECRET)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]] && !v.includes("[SENSITIVE]")) process.env[m[1]] = v;
    }
  }
}

loadLocalSecrets();

const taskId = process.argv[2] || "8eaa7926-f13a-41af-83e9-706a4519d10d";
const restaurantId = process.argv[3] || "cmqidth3w0002uodgg9ugg3wa";

function decryptApiKey(enc) {
  const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!keyHex || enc.includes(":") === false) throw new Error("No encryption key");
  const key = Buffer.from(keyHex, "hex");
  const [ivB64, tagB64, dataB64] = enc.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query(
  `SELECT api_key_enc FROM marketing_ai_provider_connections
   WHERE restaurant_id = $1 AND provider_key = 'RUNWAY' AND category = 'VIDEO' LIMIT 1`,
  [restaurantId]
);
await client.end();

if (!rows[0]?.api_key_enc) {
  console.error("No Runway connection");
  process.exit(1);
}

const apiKey = decryptApiKey(rows[0].api_key_enc);
const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(taskId)}`, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "X-Runway-Version": "2024-11-06",
  },
});
const data = await res.json();
console.log(JSON.stringify({ http: res.status, task: data }, null, 2));
