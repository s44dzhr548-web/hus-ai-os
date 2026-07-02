import { NextResponse } from "next/server";
import { COMPLIANCE_CONFIG, isRealTradingAllowed } from "@/lib/compliance/config";
import { DATA_ADAPTERS, getBrokerAdapter } from "@/lib/data/adapters";

export async function GET() {
  return NextResponse.json({
    ...COMPLIANCE_CONFIG,
    realTradingAllowed: isRealTradingAllowed(),
    adapters: [...DATA_ADAPTERS, getBrokerAdapter()],
    executionStatus: "DISABLED — paper trading simulation only",
    brokerExecution: "DISABLED",
    complianceModeLocked: true,
  });
}
