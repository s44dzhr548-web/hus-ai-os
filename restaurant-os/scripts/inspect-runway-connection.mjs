/**
 * Inspect Runway connection rows (no API keys printed).
 * Usage: node scripts/inspect-runway-connection.mjs [restaurantId]
 */
import { loadMigrateEnv } from "./lib/load-migrate-env.mjs";
import pg from "pg";

loadMigrateEnv();

const restaurantId = process.argv[2];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const params = restaurantId ? [restaurantId] : [];
const sql = restaurantId
  ? `SELECT id, restaurant_id, provider_key, category, status, connection_method,
            task_assignment, last_success_at, last_error_at, last_error,
            (api_key_enc IS NOT NULL) AS has_encrypted_key,
            created_at, updated_at
     FROM marketing_ai_provider_connections
     WHERE provider_key = 'RUNWAY' AND restaurant_id = $1
     ORDER BY updated_at DESC`
  : `SELECT id, restaurant_id, provider_key, category, status, connection_method,
            task_assignment, last_success_at, last_error_at, last_error,
            (api_key_enc IS NOT NULL) AS has_encrypted_key,
            created_at, updated_at
     FROM marketing_ai_provider_connections
     WHERE provider_key = 'RUNWAY'
     ORDER BY updated_at DESC
     LIMIT 20`;

const { rows } = await client.query(sql, params);

console.log(JSON.stringify({ count: rows.length, rows }, null, 2));
await client.end();
