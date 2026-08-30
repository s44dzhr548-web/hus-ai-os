export function buildReviewUrl(params: {
  baseUrl: string;
  slug: string;
  visitId: string;
  tableDisplay?: string | null;
}) {
  const origin = params.baseUrl.replace(/\/$/, "");
  const url = new URL(`${origin}/r/${params.slug}/rate`);
  url.searchParams.set("visit", params.visitId);
  if (params.tableDisplay) {
    url.searchParams.set("table", params.tableDisplay);
  }
  return url.toString();
}

export function resolveAppBaseUrl(): string {
  return (
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://www.menuhus.com"
  ).replace(/\/$/, "");
}
