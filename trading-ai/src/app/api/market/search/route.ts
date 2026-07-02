import { NextResponse } from "next/server";
import { unifiedSearch } from "@/lib/market/unified";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? 20);
  const results = await unifiedSearch(q, limit);
  return NextResponse.json({ query: q, count: results.length, results });
}
