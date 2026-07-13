import { NextRequest, NextResponse } from "next/server";
import { requireMarketingAccess } from "@/lib/marketing/auth";
import { stubAssistantReply } from "@/lib/marketing/simulation-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error } = await requireMarketingAccess();
  if (error) return error;
  const { message } = await req.json();
  const reply = stubAssistantReply(String(message || ""));
  return NextResponse.json({
    ...reply,
    disclaimer: "محاكاة — لا مزود AI متصل",
    provider: "stub",
  });
}
