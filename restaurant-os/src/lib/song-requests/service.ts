import type { SongRequestStatus, SongRequestTarget } from "@prisma/client";
import prisma from "@/lib/prisma";
import { assertCustomerTableSession } from "@/lib/customer-table-session";
import { getActiveSessionForTable } from "@/lib/reception";
import { SONG_STATUS_LABELS_AR, SONG_TARGET_LABELS_AR } from "./types";

function serializeSongRequest(r: {
  id: string;
  songName: string;
  artistName: string | null;
  linkUrl: string | null;
  dedicationMessage: string | null;
  target: SongRequestTarget;
  targetTableNumber: string | null;
  status: SongRequestStatus;
  tableNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    songName: r.songName,
    artistName: r.artistName,
    linkUrl: r.linkUrl,
    dedicationMessage: r.dedicationMessage,
    target: r.target,
    targetLabel: SONG_TARGET_LABELS_AR[r.target],
    targetTableNumber: r.targetTableNumber,
    status: r.status,
    statusLabel: SONG_STATUS_LABELS_AR[r.status],
    tableNumber: r.tableNumber,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function assertSongRequestsEnabled(restaurantId: string) {
  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { customerSongRequestsEnabled: true },
  });
  if (!r?.customerSongRequestsEnabled) {
    throw new Error("ميزة طلب الأغاني غير مفعّلة");
  }
}

export async function createSongRequest(params: {
  tableId: string;
  songName: string;
  artistName?: string | null;
  linkUrl?: string | null;
  dedicationMessage?: string | null;
  target: SongRequestTarget;
  targetTableId?: string | null;
}) {
  const ctx = await assertCustomerTableSession(params.tableId);
  await assertSongRequestsEnabled(ctx.restaurantId!);

  const songName = params.songName?.trim();
  if (!songName || songName.length < 1) {
    throw new Error("يرجى إدخال اسم الأغنية");
  }

  const validTargets: SongRequestTarget[] = [
    "SAME_TABLE",
    "OTHER_TABLE",
    "WHOLE_RESTAURANT",
  ];
  if (!validTargets.includes(params.target)) {
    throw new Error("الهدف غير صالح");
  }

  let targetTableId: string | null = null;
  let targetTableNumber: string | null = null;

  if (params.target === "OTHER_TABLE") {
    if (!params.targetTableId) {
      throw new Error("يرجى اختيار الطاولة المستهدفة");
    }
    const targetTable = await prisma.diningTable.findFirst({
      where: {
        id: params.targetTableId,
        branchId: ctx.branchId!,
        isActive: true,
      },
    });
    if (!targetTable) throw new Error("الطاولة المستهدفة غير موجودة");

    const targetSession = await getActiveSessionForTable(targetTable.id);
    if (!targetSession) throw new Error("الطاولة المستهدفة غير نشطة");

    targetTableId = targetTable.id;
    targetTableNumber =
      targetSession.tableDisplayNumber ??
      targetTable.displayNumber ??
      String(targetTable.number);
  }

  const request = await prisma.songRequest.create({
    data: {
      restaurantId: ctx.restaurantId!,
      branchId: ctx.branchId,
      tableId: ctx.tableId!,
      sessionId: ctx.sessionId!,
      tableNumber: ctx.tableDisplayNumber,
      songName,
      artistName: params.artistName?.trim() || null,
      linkUrl: params.linkUrl?.trim() || null,
      dedicationMessage: params.dedicationMessage?.trim() || null,
      target: params.target,
      targetTableId,
      targetTableNumber,
      status: "PENDING_REVIEW",
    },
  });

  return serializeSongRequest(request);
}

export async function listSongRequestsForTable(tableId: string) {
  const ctx = await assertCustomerTableSession(tableId);
  const requests = await prisma.songRequest.findMany({
    where: { sessionId: ctx.sessionId! },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return requests.map(serializeSongRequest);
}

export async function listActiveTablesForSongTarget(senderTableId: string) {
  const ctx = await assertCustomerTableSession(senderTableId);
  await assertSongRequestsEnabled(ctx.restaurantId!);

  const sessions = await prisma.tableSession.findMany({
    where: {
      branchId: ctx.branchId!,
      endedAt: null,
      status: { not: "COMPLETED" },
      tableId: { not: senderTableId },
    },
    include: { table: { select: { id: true, number: true, label: true } } },
    orderBy: { tableNumber: "asc" },
  });

  return sessions.map((s) => ({
    tableId: s.tableId,
    tableNumber: s.tableDisplayNumber ?? String(s.tableNumber),
    tableLabel: s.tableLabel ?? s.table?.label ?? null,
  }));
}

export async function listRestaurantSongRequests(restaurantId: string) {
  const requests = await prisma.songRequest.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return requests.map(serializeSongRequest);
}

export async function updateSongRequestStatusAdmin(
  requestId: string,
  restaurantId: string,
  status: SongRequestStatus
) {
  const request = await prisma.songRequest.findFirst({
    where: { id: requestId, restaurantId },
  });
  if (!request) throw new Error("طلب الأغنية غير موجود");

  const data: { status: SongRequestStatus; playedAt?: Date } = { status };
  if (status === "PLAYED") {
    data.playedAt = new Date();
  }

  const updated = await prisma.songRequest.update({
    where: { id: requestId },
    data,
  });
  return serializeSongRequest(updated);
}
