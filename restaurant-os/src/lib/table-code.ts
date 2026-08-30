import {
  PERMANENT_QR_BASE_URL,
  permanentQrUrlForTable,
  ensureTablePublicQrToken,
} from "@/lib/permanent-qr";

export function tableCodeFor(slug: string, number: number) {
  return `${slug}-t${number}`;
}

/** @deprecated Prefer permanentQrUrlForTable — slug/tableId URLs change over time. */
export function legacyMenuUrlForTable(
  tableId: string,
  slug?: string | null,
  _tableCode?: string | null
) {
  const base = PERMANENT_QR_BASE_URL;
  if (slug) return `${base}/r/${slug}/table/${tableId}`;
  return `${base}/menu/${tableId}`;
}

export function menuUrlForTable(
  tableId: string,
  slug?: string | null,
  tableCode?: string | null,
  publicQrToken?: string | null
) {
  const permanent = permanentQrUrlForTable({ publicQrToken });
  if (permanent) return permanent;
  return legacyMenuUrlForTable(tableId, slug, tableCode);
}

export async function menuUrlForTableRecord(tableId: string) {
  const token = await ensureTablePublicQrToken(tableId);
  return `${PERMANENT_QR_BASE_URL}/q/${token}`;
}

/** Numeric sort for table numbers (1, 2, 10 not 1, 10, 2). */
export function sortTablesByNumber<T extends { number: number }>(tables: T[]): T[] {
  return [...tables].sort((a, b) => a.number - b.number);
}
