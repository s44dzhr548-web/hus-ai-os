import { NextResponse } from "next/server";
import { getProviderHealth } from "@/lib/market/unified";
import { getBrokerAdapter } from "@/lib/data/adapters";

export async function GET() {
  return NextResponse.json({
    providers: getProviderHealth(),
    broker: getBrokerAdapter(),
  });
}
