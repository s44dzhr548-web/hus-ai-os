import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import { requireTableManagement } from "@/lib/table-management-permissions";
import prisma from "@/lib/prisma";
import { checkLimitAllowed } from "@/lib/permissions-engine";
import { computeEnterpriseStats } from "@/lib/table-enterprise-stats";
import { parseBranchSections, defaultSections } from "@/lib/table-sections";
import {
  archiveManagedTable,
  createManagedTable,
  getTableWarnings,
  updateManagedTable,
} from "@/lib/table-management-service";

export const dynamic = "force-dynamic";

const tableInclude = {
  branch: { select: { name: true, nameAr: true } },
  _count: {
    select: {
      orders: true,
      reservations: true,
      tableSessions: true,
    },
  },
};

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const branchId = req.nextUrl.searchParams.get("branchId");
  const search = req.nextUrl.searchParams.get("search")?.trim();
  const area = req.nextUrl.searchParams.get("area");
  const status = req.nextUrl.searchParams.get("status");
  const includeArchived = req.nextUrl.searchParams.get("archived") === "1";
  const warningsFor = req.nextUrl.searchParams.get("warningsFor");

  const occFilter = req.nextUrl.searchParams.get("occupancy");

  if (warningsFor) {
    const warnings = await getTableWarnings(warningsFor, restaurantId!);
    return NextResponse.json(warnings);
  }

  const tables = await prisma.diningTable.findMany({
    where: {
      branch: { restaurantId: restaurantId! },
      ...(branchId ? { branchId } : {}),
      ...(includeArchived ? {} : { isArchived: false }),
      ...(area ? { floorZone: area } : {}),
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "disabled" ? { isActive: false } : {}),
      ...(occFilter === "occupied" ? { operationalStatus: "OCCUPIED" } : {}),
      ...(occFilter === "free" ? { operationalStatus: "AVAILABLE" } : {}),
      ...(occFilter === "reserved" ? { operationalStatus: "RESERVED" } : {}),
      ...(req.nextUrl.searchParams.get("qr") === "yes" ? { qrCode: { not: null } } : {}),
      ...(req.nextUrl.searchParams.get("qr") === "no" ? { qrCode: null } : {}),
      ...(search
        ? {
            OR: [
              { label: { contains: search, mode: "insensitive" } },
              ...(Number.isFinite(parseInt(search, 10))
                ? [{ number: parseInt(search, 10) }]
                : []),
            ],
          }
        : {}),
    },
    include: tableInclude,
    orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
  });

  const stats = computeEnterpriseStats(tables);

  let sections = defaultSections();
  let floorPlan = null;
  if (branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, restaurantId: restaurantId! },
      select: { tableSectionsJson: true, floorPlanJson: true },
    });
    if (branch) {
      sections = parseBranchSections(branch.tableSectionsJson ?? defaultSections());
      floorPlan = branch.floorPlanJson;
    }
  }

  const useFullFormat =
    req.nextUrl.searchParams.get("format") === "full" ||
    search ||
    area ||
    status ||
    occFilter ||
    req.nextUrl.searchParams.get("qr") ||
    includeArchived ||
    branchId;

  if (useFullFormat) {
    return NextResponse.json({ tables, stats, sections, floorPlan });
  }

  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const auth = await requireTableManagement();
  if (auth.error) return auth.error;
  const { restaurantId, session } = auth;

  const body = await req.json();

  if (body.bulk) {
    const { branchId, count, startNumber = 1 } = body;
    const qty = parseInt(count);
    if (!branchId || !qty || qty < 1) {
      return NextResponse.json({ error: "الفرع وعدد الطاولات مطلوبان" }, { status: 400 });
    }

    const limit = await checkLimitAllowed(restaurantId!, "tables", qty);
    if (!limit.allowed) {
      return NextResponse.json({ error: limit.message, upgrade: true }, { status: 403 });
    }

    const created = [];
    let num = parseInt(String(startNumber));
    for (let i = 0; i < qty; i++) {
      try {
        created.push(
          await createManagedTable(restaurantId!, session!.user.id, {
            branchId,
            number: num + i,
          })
        );
      } catch (e) {
        let n = num + i;
        while (true) {
          try {
            created.push(
              await createManagedTable(restaurantId!, session!.user.id, {
                branchId,
                number: n,
              })
            );
            break;
          } catch {
            n++;
          }
        }
      }
    }
    return NextResponse.json({ created, count: created.length }, { status: 201 });
  }

  const { branchId, number, label, capacity, floorZone, tableCode } = body;
  if (!branchId || !number) {
    return NextResponse.json({ error: "الفرع ورقم الطاولة مطلوبان" }, { status: 400 });
  }

  const limit = await checkLimitAllowed(restaurantId!, "tables");
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message, upgrade: true }, { status: 403 });
  }

  try {
    const table = await createManagedTable(restaurantId!, session!.user.id, {
      branchId,
      number: parseInt(number),
      label,
      capacity: capacity ? parseInt(capacity) : undefined,
      floorZone,
      tableCode,
    });
    return NextResponse.json(table, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل الإنشاء" },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireTableManagement();
  if (auth.error) return auth.error;
  const { restaurantId, session } = auth;

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) {
    return NextResponse.json({ error: "معرف الطاولة مطلوب" }, { status: 400 });
  }

  try {
    const table = await updateManagedTable(restaurantId!, session!.user.id, id, {
      number: data.number != null ? parseInt(data.number) : undefined,
      label: data.label,
      capacity: data.capacity != null ? parseInt(data.capacity) : undefined,
      floorZone: data.zone ?? data.floorZone,
      isActive: data.isActive,
      sortOrder: data.sortOrder != null ? parseInt(String(data.sortOrder)) : undefined,
      tableCode: data.tableCode,
      notes: data.notes,
      tableIcon: data.tableIcon,
      floorMapX: data.floorMapX != null ? parseInt(String(data.floorMapX)) : undefined,
      floorMapY: data.floorMapY != null ? parseInt(String(data.floorMapY)) : undefined,
      minimumSpendAmount:
        data.minimumSpendAmount != null && data.minimumSpendAmount !== ""
          ? parseFloat(String(data.minimumSpendAmount))
          : data.minimumSpendAmount === "" || data.minimumSpendAmount === null
            ? null
            : undefined,
    });
    return NextResponse.json(table);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل التحديث" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireTableManagement();
  if (auth.error) return auth.error;
  const { restaurantId, session } = auth;

  const id = req.nextUrl.searchParams.get("id");
  const force = req.nextUrl.searchParams.get("force") === "1";
  if (!id) {
    return NextResponse.json({ error: "معرف الطاولة مطلوب" }, { status: 400 });
  }

  try {
    const archived = await archiveManagedTable(restaurantId!, session!.user.id, id, force);
    return NextResponse.json({ archived: true, table: archived });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل الحذف" },
      { status: 400 }
    );
  }
}
