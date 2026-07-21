import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('table_gifts', 'staff_audit_events')
    ORDER BY 1
  `;
  const giftCols = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS col_count
    FROM information_schema.columns
    WHERE table_name = 'table_gifts'
  `;
  const auditCols = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS col_count
    FROM information_schema.columns
    WHERE table_name = 'staff_audit_events'
  `;
  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at
    FROM _prisma_migrations
    WHERE migration_name LIKE '%table_gifts%' OR migration_name LIKE '%visit_tracking%'
    ORDER BY finished_at
  `;
  console.log(JSON.stringify({ tables, giftCols, auditCols, migrations }, null, 2));
} finally {
  await prisma.$disconnect();
}
