#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const neon = readFileSync(join(root, "..", ".env.neon"), "utf8")
  .split("\n")
  .find((l) => l.startsWith("postgresql://"))
  ?.trim()
  .replace("-pooler", "");

process.env.DATABASE_URL = neon;
const prisma = new PrismaClient();

const locks = await prisma.$queryRaw`
  SELECT l.pid::int, a.state, left(a.query, 120) AS query
  FROM pg_locks l
  JOIN pg_stat_activity a ON l.pid = a.pid
  WHERE l.locktype = 'advisory'
    AND l.pid <> pg_backend_pid()
`;

console.log("Advisory locks:", JSON.stringify(locks, null, 2));

for (const row of locks) {
  const pid = Number(row.pid);
  const r = await prisma.$executeRawUnsafe(`SELECT pg_terminate_backend(${pid})`);
  console.log("terminated", pid, r);
}

await prisma.$disconnect();
console.log("Done");
