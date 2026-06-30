import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "dropshipping-research",
    timestamp: new Date().toISOString(),
  });
}
