import { NextResponse } from "next/server";
import { getRegistry } from "@/lib/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getRegistry());
}
