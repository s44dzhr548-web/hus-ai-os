import { NextResponse } from "next/server";
import { fetchEconomicCalendar } from "@/lib/market/providers/news";

export async function GET() {
  const result = await fetchEconomicCalendar();
  return NextResponse.json({
    events: result.events,
    source: result.source,
    isDemoData: result.isDemoData,
  });
}
