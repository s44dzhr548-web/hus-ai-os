import prisma from "@/lib/prisma";

export async function loadStaffNameMap(userIds: (string | null | undefined)[]) {
  const ids = [...new Set(userIds.filter(Boolean))] as string[];
  if (ids.length === 0) return new Map<string, string>();

  const [users, staff] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    }),
    prisma.staff.findMany({
      where: { userId: { in: ids }, isActive: true },
      select: { userId: true, name: true },
    }),
  ]);

  const map = new Map<string, string>();
  for (const u of users) map.set(u.id, u.name || u.email);
  for (const s of staff) {
    if (s.userId) map.set(s.userId, s.name);
  }
  return map;
}
