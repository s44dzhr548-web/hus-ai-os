import { NextResponse } from "next/server";
import { getEventImpactMap } from "@/lib/intelligence/event-impact";

export async function GET() {
  return NextResponse.json(getEventImpactMap());
}
