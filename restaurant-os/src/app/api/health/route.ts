import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "restaurant-os",
    timestamp: new Date().toISOString(),
  });
}
