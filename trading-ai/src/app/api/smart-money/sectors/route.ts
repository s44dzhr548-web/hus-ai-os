import { NextResponse } from "next/server";
import { buildSmartMoneySnapshot } from "@/lib/intelligence/smart-money-engine";

export async function GET() {
  const snapshot = await buildSmartMoneySnapshot();
  return NextResponse.json({
    inflows: snapshot.sectorInflows,
    outflows: snapshot.sectorOutflows,
    assetFlows: snapshot.assetFlows,
    regime: snapshot.regime,
    regimeLabelEn: snapshot.regimeLabelEn,
    regimeLabelAr: snapshot.regimeLabelAr,
    updatedAt: snapshot.updatedAt,
  });
}
