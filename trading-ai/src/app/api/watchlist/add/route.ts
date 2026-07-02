import { NextResponse } from "next/server";
import { addToWatchlist, watchlistPersistenceStatus } from "@/lib/watchlist/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { symbol?: string };
  if (!body.symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const result = addToWatchlist(body.symbol);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, item: result.item, persistence: watchlistPersistenceStatus() });
}

export async function GET() {
  const { getWatchlist } = await import("@/lib/watchlist/store");
  return NextResponse.json({ items: getWatchlist(), persistence: watchlistPersistenceStatus() });
}
