import { NextResponse } from "next/server";
import { getResearchNews } from "@/lib/intelligence/research-agent";

export async function GET() {
  return NextResponse.json(await getResearchNews());
}
