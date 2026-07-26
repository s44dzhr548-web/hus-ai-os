/**
 * Run repair script with env loaded (no secrets logged).
 * Usage:
 *   node scripts/run-repair-checkin.mjs --env-file=../.env
 *   node scripts/run-repair-checkin.mjs --env-file=../.env --apply --restaurant=fabrika-mqkat9dw
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvFile } from "./load-env-file.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const envArg = process.argv.find((a) => a.startsWith("--env-file="));
const envFile = envArg ? envArg.split("=")[1] : "../.env";
loadEnvFile(path.resolve(root, envFile));

const extra = process.argv.filter((a) => !a.startsWith("--env-file=") && a !== process.argv[0] && a !== process.argv[1]);

const r = spawnSync(process.execPath, [path.join(__dirname, "repair-reservation-checkin-state.mjs"), ...extra], {
  stdio: "inherit",
  env: process.env,
});

process.exit(r.status ?? 1);
