import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import QRCode from "qrcode";
import { menuUrlForTable } from "@/lib/table-code";
import { ensureTablePublicQrToken } from "@/lib/permanent-qr";

export const dynamic = "force-dynamic";

async function generateQr(url: string, width = 300) {
  return QRCode.toDataURL(url, {
    width,
    margin: 2,
    color: { dark: "#047857", light: "#ffffff" },
  });
}

async function resolveTableMenuUrl(table: {
  id: string;
  qrCode: string | null;
  tableCode: string | null;
  publicQrToken: string | null;
  branch: { restaurant: { slug: string } };
}) {
  const token = table.publicQrToken || (await ensureTablePublicQrToken(table.id));
  return menuUrlForTable(table.id, table.branch.restaurant.slug, table.tableCode, token);
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const id = req.nextUrl.searchParams.get("id");
  const tableId = req.nextUrl.searchParams.get("tableId");

  if (tableId || type === "table") {
    const tid = tableId || id;
    if (!tid) {
      return NextResponse.json({ error: "معرف الطاولة مطلوب" }, { status: 400 });
    }

    const table = await prisma.diningTable.findUnique({
      where: { id: tid },
      include: {
        branch: {
          select: {
            name: true,
            nameAr: true,
            restaurant: { select: { name: true, nameAr: true, logoUrl: true, slug: true } },
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json({ error: "الطاولة غير موجودة" }, { status: 404 });
    }

    const menuUrl = await resolveTableMenuUrl(table);
    const qrDataUrl = await generateQr(menuUrl);

    return NextResponse.json({ type: "table", table, menuUrl, qrDataUrl });
  }

  if (type === "branch" && id) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: { restaurant: { select: { name: true, nameAr: true } } },
    });
    if (!branch) {
      return NextResponse.json({ error: "الفرع غير موجود" }, { status: 404 });
    }

    const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.menuhus.com"}/menu?branch=${branch.id}`;
    const qrDataUrl = await generateQr(menuUrl);

    return NextResponse.json({ type: "branch", branch, menuUrl, qrDataUrl });
  }

  if (type === "restaurant" && id) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      return NextResponse.json({ error: "المطعم غير موجود" }, { status: 404 });
    }

    const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.menuhus.com"}/menu?restaurant=${restaurant.id}`;
    const qrDataUrl = await generateQr(menuUrl);

    return NextResponse.json({ type: "restaurant", restaurant, menuUrl, qrDataUrl });
  }

  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const branchId = req.nextUrl.searchParams.get("branchId");

  const [restaurant, branches, tables] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId! } }),
    prisma.branch.findMany({
      where: { restaurantId: restaurantId! },
      orderBy: { createdAt: "asc" },
    }),
    prisma.diningTable.findMany({
      where: {
        branch: { restaurantId: restaurantId! },
        ...(branchId ? { branchId } : {}),
      },
      include: {
        branch: {
          select: {
            name: true,
            nameAr: true,
            restaurant: { select: { slug: true } },
          },
        },
      },
      orderBy: [{ branchId: "asc" }, { number: "asc" }],
    }),
  ]);

  const restaurantUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.menuhus.com"}/menu?restaurant=${restaurantId}`;
  const restaurantQr = await generateQr(restaurantUrl, 200);

  const branchesWithQr = await Promise.all(
    branches.map(async (b) => {
      const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.menuhus.com"}/menu?branch=${b.id}`;
      return { ...b, menuUrl: url, qrDataUrl: await generateQr(url, 200) };
    })
  );

  const tablesWithQr = await Promise.all(
    tables.map(async (table) => {
      const menuUrl = await resolveTableMenuUrl(table);
      return { ...table, menuUrl, qrDataUrl: await generateQr(menuUrl, 200) };
    })
  );

  return NextResponse.json({
    restaurant: { ...restaurant, menuUrl: restaurantUrl, qrDataUrl: restaurantQr },
    branches: branchesWithQr,
    tables: tablesWithQr,
  });
}
