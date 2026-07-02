import { NextResponse } from "next/server";
import { getImprovementEngineState } from "@/lib/learning/improvement-engine";

export async function GET() {
  return NextResponse.json(getImprovementEngineState());
}
