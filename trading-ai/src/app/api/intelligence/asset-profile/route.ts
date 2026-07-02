import { NextResponse } from "next/server";
import { getAssetProfile, searchAssetProfiles } from "@/lib/intelligence/asset-profile";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const q = searchParams.get("q");

  if (q) {
    const profiles = await searchAssetProfiles(q, 10);
    return NextResponse.json({ profiles });
  }

  if (!symbol) {
    return NextResponse.json({ error: "symbol or q required" }, { status: 400 });
  }

  const profile = await getAssetProfile(symbol);
  return NextResponse.json({ profile });
}
