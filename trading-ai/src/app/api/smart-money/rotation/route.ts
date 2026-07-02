import { NextResponse } from "next/server";
import { buildSmartMoneySnapshot } from "@/lib/intelligence/smart-money-engine";

export async function GET() {
  const snapshot = await buildSmartMoneySnapshot();
  return NextResponse.json({
    rotations: snapshot.rotations,
    regime: snapshot.regime,
    summaryEn: snapshot.summaryEn,
    summaryAr: snapshot.summaryAr,
    updatedAt: snapshot.updatedAt,
  });
}
