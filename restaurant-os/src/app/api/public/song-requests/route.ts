import { NextRequest, NextResponse } from "next/server";
import {
  createSongRequest,
  listActiveTablesForSongTarget,
  listSongRequestsForTable,
} from "@/lib/song-requests/service";
import type { SongRequestTarget } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tableId = sp.get("tableId");
  if (!tableId) {
    return NextResponse.json({ error: "tableId مطلوب" }, { status: 400 });
  }
  try {
    if (sp.get("tables") === "1") {
      return NextResponse.json({
        tables: await listActiveTablesForSongTarget(tableId),
      });
    }
    return NextResponse.json({
      requests: await listSongRequestsForTable(tableId),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const request = await createSongRequest({
      tableId: body.tableId,
      songName: body.songName,
      artistName: body.artistName,
      linkUrl: body.linkUrl,
      dedicationMessage: body.dedicationMessage,
      target: body.target as SongRequestTarget,
      targetTableId: body.targetTableId,
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل إرسال طلب الأغنية";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
