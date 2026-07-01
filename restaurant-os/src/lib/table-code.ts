export function tableCodeFor(slug: string, number: number) {
  return `${slug}-t${number}`;
}

export function menuUrlForTable(
  tableId: string,
  slug?: string | null,
  tableCode?: string | null
) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  if (slug && tableCode) return `${base}/r/${slug}/table/${tableCode}`;
  return `${base}/menu/${tableId}`;
}
