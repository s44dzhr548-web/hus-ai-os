export function tableCodeFor(slug: string, number: number) {
  return `${slug}-t${number}`;
}

export function menuUrlForTable(
  tableId: string,
  slug?: string | null,
  _tableCode?: string | null
) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.menuhus.com";
  if (slug) return `${base}/r/${slug}/table/${tableId}`;
  return `${base}/menu/${tableId}`;
}

/** Numeric sort for table numbers (1, 2, 10 not 1, 10, 2). */
export function sortTablesByNumber<T extends { number: number }>(tables: T[]): T[] {
  return [...tables].sort((a, b) => a.number - b.number);
}
