import { NextRequest, NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import QRCode from "qrcode";
import { menuUrlForTable, sortTablesByNumber } from "@/lib/table-code";
import { displayTableNumber } from "@/lib/table-number-normalize";
import { ensureTablePublicQrToken, PERMANENT_QR_BASE_URL } from "@/lib/permanent-qr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { restaurantId, error } = await requireRestaurant();
  if (error) return error;

  const branchId = req.nextUrl.searchParams.get("branchId");
  if (!branchId) {
    return NextResponse.json({ error: "branchId مطلوب" }, { status: 400 });
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, restaurantId: restaurantId! },
    include: {
      restaurant: { select: { name: true, nameAr: true, logoUrl: true, slug: true } },
      tables: {
        where: { isActive: true, isArchived: false },
      },
    },
  });

  if (!branch) {
    return NextResponse.json({ error: "الفرع غير موجود" }, { status: 404 });
  }

  const tables = sortTablesByNumber(branch.tables);
  const exportedAt = new Date().toISOString();
  const restaurantName = branch.restaurant.nameAr || branch.restaurant.name;

  if (req.nextUrl.searchParams.get("preview") === "1") {
    return NextResponse.json({
      restaurantName,
      branchName: branch.nameAr || branch.name,
      exportedAt,
      count: tables.length,
      qrBaseUrl: PERMANENT_QR_BASE_URL,
      tables: tables.map((t) => ({
        id: t.id,
        number: t.number,
        displayNumber: displayTableNumber(t.displayNumber || t.label || String(t.number)),
        publicQrToken: t.publicQrToken,
      })),
    });
  }

  const cards = await Promise.all(
    tables.map(async (table) => {
      const publicQrToken = table.publicQrToken || (await ensureTablePublicQrToken(table.id));
      const menuUrl = menuUrlForTable(table.id, branch.restaurant.slug, table.tableCode, publicQrToken);
      const displayNum = displayTableNumber(
        table.displayNumber || table.label || String(table.number)
      );
      const qrDataUrl = await QRCode.toDataURL(menuUrl, {
        width: 280,
        margin: 1,
        color: { dark: "#047857", light: "#ffffff" },
      });
      return { table, menuUrl, qrDataUrl, displayNum, publicQrToken };
    })
  );

  const branchName = branch.nameAr || branch.name;
  const logo = branch.restaurant.logoUrl || "";

  const metaLine = `<p class="meta">${restaurantName} — ${branchName} · ${new Date(exportedAt).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })} · ${tables.length} طاولة</p>`;

  const cardsHtml = cards
    .map(
      ({ menuUrl, qrDataUrl, displayNum }) => `
    <div class="card">
      ${logo ? `<img class="logo" src="${logo}" alt="" />` : ""}
      <h1>${restaurantName}</h1>
      <p class="branch">${branchName}</p>
      <p class="table">طاولة ${displayNum}</p>
      <img class="qr" src="${qrDataUrl}" alt="QR ${displayNum}" />
      <p class="hint">امسح الرمز لعرض القائمة والطلب</p>
      <p class="url">${menuUrl}</p>
    </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>QR Codes — ${branchName}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Tahoma, Arial, sans-serif; margin: 0; padding: 16px; background: #f3f4f6; }
    .meta { text-align: center; color: #555; font-size: 13px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .card { background: white; border: 2px solid #047857; border-radius: 16px; padding: 24px; text-align: center; page-break-inside: avoid; break-inside: avoid; }
    .logo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #111; }
    .branch { color: #666; margin: 0 0 8px; font-size: 14px; }
    .table { font-size: 28px; font-weight: bold; color: #047857; margin: 8px 0 16px; }
    .qr { width: 200px; height: 200px; margin: 0 auto; display: block; }
    .hint { font-size: 13px; color: #444; margin: 16px 0 4px; }
    .url { font-size: 10px; color: #999; word-break: break-all; direction: ltr; }
    @media print {
      body { background: white; padding: 0; }
      .grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .no-print { display: none; }
    }
    @media (max-width: 640px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:16px;">
    ${metaLine}
    <button onclick="window.print()" style="padding:12px 24px;background:#047857;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">
      طباعة / حفظ PDF
    </button>
  </div>
  <div class="grid">${cardsHtml}</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
