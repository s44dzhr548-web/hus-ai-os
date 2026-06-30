import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    app: "husai-dashboard",
    status: "ok",
    version: "1.0.0",
  });
}
