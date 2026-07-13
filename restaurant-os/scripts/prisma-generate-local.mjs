#!/usr/bin/env node
/**
 * Generate Prisma client outside OneDrive to avoid EPERM on Windows.
 * Does not touch production data — client generation only.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { tmpdir, homedir } from "os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = join(root, "prisma", "schema.prisma");
const localApp = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
const workDir = join(localApp, "restaurant-os-prisma-gen");

console.log("[prisma-generate-local] workDir:", workDir);
rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });

cpSync(schema, join(workDir, "schema.prisma"));
execSync("npm init -y", { cwd: workDir, stdio: "ignore" });
execSync("npm install prisma@6.9.0 @prisma/client@6.9.0 --no-save", {
  cwd: workDir,
  stdio: "inherit",
});
execSync("npx prisma generate --schema schema.prisma", {
  cwd: workDir,
  stdio: "inherit",
});

const srcModules = join(workDir, "node_modules");
const dstModules = join(root, "..", "node_modules");
if (!existsSync(dstModules)) {
  throw new Error(`Missing node_modules at ${dstModules}`);
}

cpSync(join(srcModules, ".prisma"), join(dstModules, ".prisma"), { recursive: true, force: true });
cpSync(join(srcModules, "@prisma", "client"), join(dstModules, "@prisma", "client"), {
  recursive: true,
  force: true,
});

console.log("[prisma-generate-local] OK — client copied to", dstModules);
